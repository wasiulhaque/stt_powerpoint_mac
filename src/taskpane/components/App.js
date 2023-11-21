import * as React from "react";
import PropTypes from "prop-types";
import { DefaultButton } from "@fluentui/react";
import Header from "./Header";
import StreamingPage from "./StreamingPage";
import FileUploaderPage from "./FileUploaderPage";
import RecordPage from "./RecordPage";
import Stack from "@mui/material/Stack";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import Button from "@mui/material/Button";
import HeadsetOutlinedIcon from "@mui/icons-material/HeadsetOutlined";
import { MicOutlined } from "@mui/icons-material";
import MicNoneOutlinedIcon from "@mui/icons-material/MicNoneOutlined";

/* global console, Office, require */

const containerStyle = {
  backgroundColor: "white",
  minHeight: "100vh",
};

const theme = createTheme({
  palette: {
    taskpane_header: {
      main: "#00AF5B",
      dark: "#00AF5B",
      contrastText: "#fff",
    },
    taskpane_header_selected: {
      main: "#008847",
      dark: "#008847",
      contrastText: "#fff",
    },
    secondary: {
      main: "#F5222D",
      dark: "#F5222D",
      contrastText: "#fff",
    },
    download: {
      main: "#136EE5",
      dark: "#136EE5",
      contrastText: "#fff",
    },
    pause: {
      main: "#7CB305",
      dark: "#7CB305",
      contrastText: "#fff",
    },
    stop: {
      main: "#CF1322",
      dark: "#CF1322",
      contrastText: "#fff",
    },
  },
  overrides: {
    MuiButton: {
      root: {
        "&:hover": {
          backgroundColor: "#fff", // Change this to your desired hover color
        },
      },
    },
  },
});

export default class App extends React.Component {
  constructor(props, context) {
    super(props, context);
    this.state = {
      listItems: [],
    };
  }

  componentDidMount() {
    this.setState({});
  }

  /**
   * Handles the Streaming button
   */
  handleStreamingButton = async () => {
    this.setState({
      isStreamingPage: true,
      isRecordPage: false,
    });
  };

  /**
   * Handles the File Upload button
   */
  handleFileUploaderButton = async () => {
    this.setState({
      isFileUploaderPage: true,
      isRecordPage: false,
      isStreamingPage: false,
    });
  };

  /**
   * Handles the Record Button
   */
  handleRecordButton = async () => {
    this.setState({
      isRecordPage: true,
      isStreamingPage: false,
    });
  };

  render() {
    const { title, isOfficeInitialized } = this.props;
    const { isStreamingPage } = this.state;
    const { isFileUploaderPage } = this.state;
    const { isRecordPage } = this.state;

    // if (isStreamingPage) {
    //   return <StreamingPage />;
    // }

    if (isFileUploaderPage) {
      return <FileUploaderPage />;
    }

    // if (isRecordPage) {
    //   return <RecordPage />;
    // }

    return (
      <ThemeProvider theme={theme}>
        <div style={containerStyle}>
          <div className="ms-welcome">
            <Header logo={require("./../../../assets/logo-filled.png")} title={this.props.title} />
            <Stack direction="row" className="ms-welcome__Stack">
              <Button
                color={this.state.isStreamingPage ? "taskpane_header_selected" : "taskpane_header"}
                variant="contained"
                size="large"
                style={{ borderRadius: "10px 0px 0px 10px", height: "50px", width: "90px", fontSize: "13px" }}
                onClick={this.handleStreamingButton}
              >
                <MicNoneOutlinedIcon fontSize="small" style={{ margin: "1px" }} />
                বলুন
              </Button>
              <Button
                color={this.state.isRecordPage ? "taskpane_header_selected" : "taskpane_header"}
                variant="contained"
                size="large"
                style={{ borderRadius: "0px", height: "50px", width: "90px", fontSize: "13px" }}
                onClick={this.handleRecordButton}
              >
                <HeadsetOutlinedIcon fontSize="small" style={{ margin: "1px" }} />
                রেকর্ড
              </Button>
              <FileUploaderPage />
            </Stack>
            {this.state.isRecordPage ? <RecordPage /> : ""}
            {this.state.isStreamingPage ? <StreamingPage /> : ""}
          </div>
        </div>
      </ThemeProvider>
    );
  }
}

App.propTypes = {
  title: PropTypes.string,
  isOfficeInitialized: PropTypes.bool,
};
