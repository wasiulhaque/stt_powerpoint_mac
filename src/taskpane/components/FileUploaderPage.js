import * as React from "react";
import PropTypes from "prop-types";
import { DefaultButton } from "@fluentui/react";
import { audioBufferToWav, chunkifyAudioBuffer, fileToAudioBuffer } from "../../../modules/chunkify"
import io from "socket.io-client";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import FileUploadOutlinedIcon from "@mui/icons-material/FileUploadOutlined";
import Snackbar from "@mui/material/Snackbar";
import Backdrop from "@mui/material/Backdrop";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";  
import { sendRequest } from "../../../modules/CommonFunctions";
import { printInPowerPoint } from "../../../modules/powerpointFunction";

export default class FileUploaderPage extends React.Component {
  constructor(props, context) {
    super(props, context);
    this.inputRef = React.createRef();
    this.socket = null;
    this.audioContextRef = React.createRef();
    (this.wavBuffer = null),
      (this.audioChunks = null),
      (this.wavFile = null),
      (this.state = {
        listItems: [],
        uploadedFile: null,
        fileUploaded: false,
        isLoading: false,
        isSocketConnected: false,
        uploadDone: true,
        audioBuffer: true,
        audioFile: null,
        index: 0,
        audioDuration: 0,
        invalidUpload: false,
        snackbarMessage: "",
        showBackdrop: false,
      });
  }

  /**
   * Initializes the socket connection
   * "connect" event is reponsible for connecting with the socket
   * "result" event is a listen event to keep listening the responses
   */
  initializeSocket = () => {
    this.socket = io(process.env.SOCKET_ADDRESS, { transports: ["websocket"], rejectUnauthorized: false });
    this.socket.on("connect", () => {
      console.log("Socket connected");
      this.setState({ isSocketConnected: true });
    });
    this.socket.on("result_upload", (data) => {
      console.log("Received result:", data);
      console.log(data.text);
      let res = "";

      for (let wordData of data.output.predicted_words) {
        let word = wordData.word;
        let isConfident = wordData.is_confident;

        if (!isConfident && word !== " ") {
          res += word;
        } else {
          res += word;
        }
      }

      console.log(res);
      if (res !== "" && res !== " ") {
        // Send and receive the response from the punctuation API
        sendRequest(res).then((data) => {
          console.log(data);
          res = data.punctuated_text;
          printInPowerPoint(res);
        });
      }

      if (data.index == this.state.index - 1) {
        this.setState({ showBackdrop: false });
      }
    });
    this.socket.on("last_result", (data) => {
      console.log("Received last result:", data);
      console.log(data.text);
      printInPowerPoint(data.text);
    });
  };

  componentDidMount() {
    this.setState({});
    if (this.state.isSocketConnected == false && this.state.fileUploaded) {
      this.initializeSocket();
    }
    if (!this.audioContextRef.current) {
      this.audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
        // sampleRate: 16000
      });
    }
  }

  /**
   * Handles the file upload input option
   */
  handleInputClick = () => {
    if (this.inputRef.current) {
      this.inputRef.current.click();
    }
  };

  handleCloseSnackbar = (event, reason) => {
    if (reason === "clickaway") {
      return;
    }
    this.setState({ invalidUpload: false });
  };

  /**
   * Handles the Upload button
   */
  handleUploadButton = async () => {
    this.setState({ index: 0 });
    this.setState({ showBackdrop: true });
    this.initializeSocket();

    this.audioBuffer = await fileToAudioBuffer(this.audioFile);
    this.wavFile = await audioBufferToWav(this.audioBuffer);
    this.wavBuffer = await fileToAudioBuffer(this.wavFile);
    this.audioChunks = chunkifyAudioBuffer(this.wavBuffer, process.env.FILE_UPLOAD_CHUNK_SIZE_IN_SECOND);

    const sendChunks = this.audioChunks;
    console.log(sendChunks);

    for (let i = 0; i < sendChunks.length; i++) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64String = event.target.result.split(",")[1];
        console.log("Sending chunk", this.state.index);
        this.socket.emit("audio_transmit_upload", {
          index: this.state.index,
          audio: base64String,
          endOfStream: this.state.index === sendChunks.length - 1,
        });
        this.setState({ index: this.state.index + 1 });
      };
      try {
        reader.readAsDataURL(sendChunks[i]);
      } catch (error) {
        console.error(error);
      }
    }

    console.log("File uploaded successfully");
  };

  /**
   * Prints the received response from the socket to MS Word
   * Texts are printed from the current cursor position
   * Prints only the first result from the response
   * As the first response is the best prediction
   * @param {string} text
   */
  printInWord = async (text) => {
    Word.run(async (context) => {
      var selection = context.document.getSelection();
      var insertText = text.split("|");
      selection.insertText(insertText[0]);
      selection.insertText(" ");
      const range = selection.getRange("end");
      range.select();
      await context.sync();
    }).catch(function (error) {
      console.error(error);
    });
  };

  /**
   * Handles the file upload event
   * @param {event} event
   */
  handleFileUpload = (event) => {
    if (event.target.files.length > 0) {
      const file = event.target.files[0];
      const reader = new FileReader();

      reader.onload = async (event) => {
        const arrayBuffer = event.target.result;

        try {
          const audioBuffer = await this.audioContextRef.current.decodeAudioData(arrayBuffer);

          if (audioBuffer.duration == 0 || audioBuffer.duration == Infinity || !audioBuffer.duration) {
            console.log("Invalid file");
            this.setState({ snackbarMessage: "দুঃখিত, আপনার ফাইলটি অনুপযুক্ত" });
            this.setState({ invalidUpload: true });
            return;
          } else if (audioBuffer.duration > 120) {
            this.setState({ snackbarMessage: "দুঃখিত, আপনার ফাইলটি ২ মিনিটের বেশি" });
            this.setState({ invalidUpload: true });
          } else {
            console.log("File duration:", audioBuffer.duration);
            this.setState({ invalidUpload: false });
            this.setState({ uploadedFile: file });
            this.audioFile = file;
            this.setState({ fileUploaded: true });
            this.handleUploadButton();
          }
        } catch (error) {
          console.log("Invalid file");
          this.setState({ snackbarMessage: "দুঃখিত, আপনার ফাইলটি অনুপযুক্ত" });
          this.setState({ invalidUpload: true });
          return;
        }
      };

      reader.readAsArrayBuffer(file);
    }
  };

  render() {
    const { fileUploaded } = this.state;
    const { invalidUpload } = this.state;
    const { snackbarMessage } = this.state;
    const {showBackdrop} = this.state;
    return (
      <div className="ms-welcome">
        <div>
          <Backdrop
            sx={(theme) => ({ color: "#fff", zIndex: theme.zIndex.drawer + 1 })}
            open={showBackdrop}
          >
            <Stack
            direction="column"
            justifyContent="center"
            alignItems="center"
            spacing={2}
            >
            <CircularProgress color="inherit" />
            <span style={{ marginLeft: "10px" }}>আপলোড হচ্ছে...</span>
            <div>
            <Button
              color= "error"
              variant="contained"
              size="large"
              style={{ borderRadius: "5px", height: "50px", width: "110px", fontSize: "13px", marginLeft: "10px" }}
              onClick={() => {
                this.setState({ invalidUpload: false });
                this.setState({ fileUploaded: false });
                this.setState({ showBackdrop: false });
                this.socket.disconnect();
              }}
            > বাতিল
            </Button>
            </div>
            </Stack>
          </Backdrop>
          <input
            ref={this.inputRef}
            id="file-upload"
            type="file"
            onChange={this.handleFileUpload}
            onClick={(event) => {
              event.target.value = "";
              this.setState({ invalidUpload: false });
            }}
            style={{ display: "none" }}
            accept="audio/*"
          />
          <label htmlFor="file-upload">
            <Button
              color="taskpane_header"
              variant="contained"
              size="large"
              style={{ borderRadius: "0px 10px 10px 0px", height: "50px", width: "110px", fontSize: "13px" }}
              onClick={this.handleInputClick}
            >
              <FileUploadOutlinedIcon fontSize="small" style={{ margin: "1px" }} />
              আপলোড
            </Button>
          </label>
          <Snackbar
            open={invalidUpload}
            autoHideDuration={2500}
            onClose={this.handleCloseSnackbar}
            anchorOrigin={{ vertical: "top", horizontal: "center" }}
          >
            <Alert onClose={this.handleCloseSnackbar} severity="error" variant="filled" sx={{ width: "100%" }}>
              {snackbarMessage}
            </Alert>
          </Snackbar>
        </div>
      </div>
    );
  }
}