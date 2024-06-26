﻿# Deep-Inspect-Chrome-Extension

## Description

Deep Inspect is a Chrome extension that allows you to record audio from any Chrome tab. It provides a simple interface for recording audio and analyzing it for human touchpoints.

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/n-huzaifa/Deep-Inspect-Chrome-Extension.git
   ```

2. Open Chrome and go to `chrome://extensions/`.

3. Enable Developer mode.

4. Click on "Load unpacked" and select the directory where you cloned the repository.

5. The extension should now be installed and visible in the Chrome toolbar.

## Usage

- Click on the Deep Inspect icon in the Chrome toolbar.
- Click on "Start Recording" to begin capturing audio from the current tab.
- Click on "Stop Recording" to stop capturing audio.
- You can also upload a .wav file by clicking on the "Upload .wav File" button.

## Backend API

To fully utilize the Deep Inspect Chrome extension, you'll also need the Python backend. Follow the instructions provided in the backend repository [here](https://github.com/n-huzaifa/Deep-Inspect-Api) to set it up. Once you have both the extension and the backend running, you'll have the complete functionality available for audio recording and analysis.

## Manifest

```json
{
  "name": "Deep Inspect",
  "version": "0.2",
  "manifest_version": 3,
  "permissions": ["tabs", "activeTab", "tabCapture"],
  "host_permissions": ["https://*/"],
  "action": {
    "default_popup": "home.html",
    "default_action": "home.js",
    "default_icon": "logo128.png"
  }
}
```

## Credits

- [Font Awesome](https://fontawesome.com/) - for the cloud upload icon.
- [Google Fonts](https://fonts.google.com/) - for the Poppins font.
- [Chrome Tab Capture API](https://developer.chrome.com/docs/extensions/reference/tabCapture/) - for capturing audio from Chrome tabs.

## License

This project is licensed under the [MIT License](https://opensource.org/license/mit), with the additional condition that any usage or distribution of this project must prominently display credit to the original author [n-huzaifa](https://github.com/n-huzaifa). Failure to provide proper credit constitutes a violation of the license terms.
