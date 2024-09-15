import * as React from "react";
import PropTypes from "prop-types";
import { DefaultButton, Icon } from "@fluentui/react";
import Header from "./Header";
import App from "./App";
import Stack from "@mui/material/Stack";
import { audioBufferToWav, fileToAudioBuffer } from "../../../modules/chunkify";
import io from "socket.io-client";
import MicIcon from "@mui/icons-material/Mic";
import StopIcon from "@mui/icons-material/Stop";
import CircularProgress from "@mui/material/CircularProgress";
import Button from "@mui/material/Button";
import smallMic from "../../../assets/smallMic.png";
import stopButton from "../../../assets/stopButton.png";
import Chip from "@mui/material/Chip";
import { printInPowerPoint } from "../../../modules/powerpointFunction";

export default class VoiceRecorderPage extends React.Component {
  constructor(props, context) {
    super(props, context);
    this.recording = null;
    this.mediaRecorder = null;
    this.recorder = null;
    this.chunks = [];
    this.audioBuffer = null;
    this.wavBuffer = null;
    this.audioChunks = [];
    this.timeInterval = null;
    this.wavFile = null;
    this.socket = null;
    this.stream = null;
    this.audioSendInterval = null;
    this.state = {
      listItems: [],
      isRecording: false,
      recordingTime: 0,
      isLoading: false,
      isSocketConnected: false,
      recordingTime: 0,
      index: 0,
      endOfStream: false,
    };
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
    this.socket.on("result", (data) => {
      console.log("Received result:", data);
      console.log(data.text);
      let res = "";
      if (data.chunk == "small_chunk") {
      for (let wordData of data.output.predicted_words) {
        let word = wordData.word;
        let isConfident = wordData.is_confident;

        if (!isConfident && word !== " ") {
          res += word;
        } else {
          res += word;
        }
      }
    }
      console.log(res);
      if (res !== "" && res !== " "){
        printInPowerPoint(res);
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
    if (this.state.isSocketConnected == false) {
      this.initializeSocket();
    }
  }

  componentWillUnmount() {
    if(this.state.isRecording == true){
      this.handleStop();
    }
  }

  /**
   * Handles Start Recording Button
   * Interval time is set to 500ms
   */
  handleStartButton = async () => {
    this.setState({ index: 0, endOfStream: false });
    if (this.socket.connected == true) {
      this.socket.disconnect();
      this.socket.connect(); 
    }
    this.startTimer();
    if (this.state.isSocketConnected == false) {
      this.initializeSocket();
    }
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.setState({ isRecording: true });
    this.sendAudioFileSocketIO();

    if (this.audioSendInterval) {
      clearInterval(this.audioSendInterval);
    }
    
    this.audioSendInterval = setInterval(() => {
      this.sendAudioFileSocketIO();
    }, process.env.STREAMING_CHUNK_SIZE_IN_MILLISECOND);
  };

  /**
   * Sends the streaming files to the socket
   * Timeout time is set to 500ms
   */
  sendAudioFileSocketIO = async () => {
    const recorder = new MediaRecorder(this.stream);
    recorder.ondataavailable = async (e) => {
      this.audioBuffer = await fileToAudioBuffer(e.data);
      this.wavFile = audioBufferToWav(this.audioBuffer);
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64String = window.btoa(event.target.result);
        console.log("Sending chunk: ", this.state.index, "End of Stream: ", this.state.endOfStream); 
        this.socket.emit("audio_transmit", {
          index: this.state.index,
          audio: base64String,
          endOfStream: this.state.endOfStream,
        });
        this.setState({ index: this.state.index + 1 });
      };
      try {
        reader.readAsBinaryString(this.wavFile);
      } catch (error) {
        console.error(error);
      }
    };
    setTimeout(() => {
      recorder.stop();
    }, process.env.STREAMING_CHUNK_SIZE_IN_MILLISECOND);
    recorder.start();
  };

  /**
   * Handles Stop Recording button
   */
  handleStop = () => {
    this.socket.emit("audio_transmit", {
      endOfStream: true,
    });
    this.stopTimer();

    if (this.audioSendInterval) {
      clearInterval(this.audioSendInterval);
      this.audioSendInterval = null; // Reset the interval ID
    }


    // this.socket.disconnect(() => {
    //   console.log("Socket disconnected");
    // });
    this.setState({
      isRecording: false,
      // isSocketConnected: false,
      endOfStream: true,
    });
    if (this.stream) {
      const tracks = this.stream.getTracks();
      tracks.forEach((track) => track.stop());
      this.stream = null;
    }
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

  /**
   * Handles Go Back button
   */
  click = async () => {
    this.setState({
      isGoBack: true,
    });
  };

  render() {
    const { isGoBack, isRecording, recordingTime } = this.state;
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
            onClick={isRecording ? this.handleStop : this.handleStartButton}
          >
            {!isRecording && (
              <>
                <img src={smallMic} width="48px" alt="Mic Icon" style={{ margin: "10px" }} />
                ক্লিক করুন। তারপর স্পষ্টভাবে জোরে পড়ুন।
              </>
            )}
            {isRecording && (
              <>
                <img src={stopButton} width="32px" alt="Stop Icon" style={{ margin: "10px" }} />
                <Chip label={this.formatTime(recordingTime)} variant="outlined" size="medium" />
              </>
            )}
          </Button>

          {/* <DefaultButton
            className="ms-wecome__action ms-button-uniform"
            onClick={this.handleStop}
            disabled={!isRecording}
          >
            <StopIcon />
          </DefaultButton> */}
        </Stack>
      </div>
    );
  }
}
