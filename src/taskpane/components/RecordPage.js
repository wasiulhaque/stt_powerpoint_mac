import * as React from "react";
import PropTypes from "prop-types";
import { DefaultButton } from "@fluentui/react";
import Header from "./Header";
import App from "./App";
import { audioBufferToWav, chunkifyAudioBuffer, getWavBytes, getWavHeader } from "../../../modules/chunkify";
import { fileToAudioBuffer } from "../../../modules/chunkify";
import io from "socket.io-client";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Backdrop from "@mui/material/Backdrop";
import Button from "@mui/material/Button";
import MicIcon from "@mui/icons-material/Mic";
import StopIcon from "@mui/icons-material/Stop";
import recordingStartIcon from "../../../assets/recordingStartIcon.png";
import recordingStopIcon from "../../../assets/recordingStopIcon.png";
import stopButton from "../../../assets/stopButton.png";
import Chip from "@mui/material/Chip";

export default class RecordPage extends React.Component {
  constructor(props, context) {
    super(props, context);
    this.recording = null;
    this.mediaRecorder = null;
    this.chunks = [];
    this.audioBuffer = null;
    this.wavBuffer = null;
    this.audioChunks = [];
    this.timeInterval = null;
    this.wavFile = null;
    this.socket = null;
    this.audioStream = null;
    this.state = {
      listItems: [],
      isRecording: false,
      recordingTime: 0,
      isLoading: false,
      isSocketConnected: false,
    };
  }

  /**
   * Initializes the socket connection
   * "connect" event is reponsible for connecting with the socket
   * "result" event is a listen event to keep listening the responses
   */
  initializeSocket = () => {
    this.socket = io(process.env.SOCKET_ADDRESS, { transports: ["websocket"] });
    this.socket.on("connect", () => {
      console.log("Socket connected");
      this.setState({ isSocketConnected: true });
    });
    this.socket.on("result", (data) => {
      console.log("Received result:", data);
      console.log(data.text);
      this.printInPowerPoint(data.text);
    });
    this.socket.on("last_result", (data) => {
      console.log("Received last result:", data);
      console.log(data.text);
      this.printInPowerPoint(data.text);
    });
  };

  componentDidMount() {
    this.setState({});
    if (this.state.isSocketConnected == false && this.state.isRecording) {
      this.initializeSocket();
    }
  }

  /**
   * Handles the Go Back button
   */
  click = async () => {
    this.setState({
      isGoBack: true,
    });
  };

  /**
   * Prints the received response from the socket to MS Word
   * Texts are printed from the current cursor position
   * Prints only the first result from the response
   * As the first response is the best prediction
   * @param {string} text
   */
  printInPowerPoint = async (text) => {
    await PowerPoint.run(async (context) => {
      const shapes = context.presentation.getSelectedShapes();
      const shapeCount = shapes.getCount();
      await context.sync();
      shapes.load("items");
      await context.sync();
      shapes.items.map(async (shape, index) => {
        console.log(shape.id);
        shape.load("textFrame/textRange");
        await context.sync();
        const textRange = shape.textFrame.textRange;
        textRange.text = textRange.text + " " + text;
        await context.sync();
      });
    });
  };

  /**
   * Handles the Start Recording button
   */
  startRecording = async () => {
    if (this.state.isSocketConnected == false) {
      this.initializeSocket();
    }
    try {
      this.audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(this.audioStream);
      this.mediaRecorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) {
          this.chunks.push(event.data);
        }
      });
      this.mediaRecorder.start();
      this.setState({ isRecording: true });
      this.startTimer();
    } catch (error) {
      console.error("Error starting recording: ", error);
    }
  };

  /**
   * Handles the Stop Recording Button
   */
  stopRecording = async () => {
    this.mediaRecorder.addEventListener("stop", async () => {
      this.wavFile = null;
      this.audioBuffer = null;
      const audioBlob = new Blob(this.chunks, { type: "audio/wav" });
      this.audioBuffer = await fileToAudioBuffer(audioBlob);
      this.wavFile = await audioBufferToWav(this.audioBuffer);
      this.wavBuffer = await fileToAudioBuffer(this.wavFile);
      this.audioChunks = chunkifyAudioBuffer(this.wavBuffer, process.env.RECORDING_CHUNK_SIZE_IN_SECOND);

      const sendChunks = this.audioChunks;
      console.log(sendChunks);

      for (let i = 0; i < sendChunks.length; i++) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64String = window.btoa(event.target.result);
          console.log(base64String);
          this.socket.emit("audio_transmit", {
            file: base64String,
          });
          if (i + 1 == sendChunks.length) {
            this.socket.emit("audio_transmit", {
              endOfStream: true,
            });
          }
        };
        try {
          reader.readAsBinaryString(sendChunks[i]);
        } catch (error) {
          console.error(error);
        }
      }
      this.chunks = [];
      this.wavBuffer = [];
      this.audioChunks = [];
      this.wavFile = null;
      if (this.audioStream) {
        const tracks = this.audioStream.getTracks();
        tracks.forEach((track) => track.stop());
        this.audioStream = null;
      }
    });
    this.mediaRecorder.stop();
    this.setState({ isRecording: false });
    this.stopTimer();
    this.chunks = [];
    this.wavFile = null;
    this.audioBuffer = null;
  };

  /**
   * Starts the timer
   */
  startTimer = () => {
    this.timeInterval = setInterval(() => {
      this.setState((prevState) => ({
        recordingTime: prevState.recordingTime + 1,
      }));
    }, 1000);
  };

  /**
   * Stops the timer
   */
  stopTimer = () => {
    clearInterval(this.timeInterval);
    this.setState({ recordingTime: 0 });
  };

  /**
   * Formats the time for the timer
   */
  formatTime = (timeInSeconds) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  render() {
    const { isGoBack, isRecording, recordingTime, isLoading } = this.state;
    if (isGoBack) {
      return <App />;
    }
    return (
      <div className="ms-welcome">
        <Stack spacing={2} direction="row" className="ms-welcome__Stack">
          <Button
            sx={{
              width: "250px",
              height: "70px",
              marginRight: "10px",
              color: "#73747B",
              borderRadius: "5px",
              "&:hover": {
                backgroundColor: "rgba(160, 161, 165, 0.3)", // Change the hover background color
              },
            }}
            onClick={isRecording ? this.stopRecording : this.startRecording}
          >
            {!isRecording && (
              <>
                <img src={recordingStartIcon} width="48px" alt="Mic Icon" style={{ margin: "10px" }} />
                ক্লিক করুন। পড়া সঠিক হয়েছে কিনা যাচাই করুন।
              </>
            )}
            {isRecording && (
              <>
                <img src={recordingStartIcon} width="48px" alt="Stop Icon" style={{ margin: "10px" }} />
                <Chip label={this.formatTime(recordingTime)} variant="outlined" size="medium" />
                <img src={stopButton} width="32px" alt="Stop Icon" style={{ margin: "10px" }} />
              </>
            )}
          </Button>
        </Stack>
      </div>
    );
  }
}
