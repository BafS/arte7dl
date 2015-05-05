# Arte+7 downloader

## Installation

    npm install -g arte7dl

## Usage

    arte7dl [-q 2200|1500|800] [--title 'title pattern'] <url>

The title pattern can use video informations using `%` to delimite the variable.
 - Exemple: `%title% %year% %lang% [arte7]`
 - Available options: `title`, `subtitle`, `description`, `lang`, `year`, `time`, `director`, `image` 
 - Default pattern: `%title%% - subtitle% %(year)% [arte]`

### Exemples

- `arte7dl 'http://www.arte.tv/guide/fr/048707-028/silex-and-the-city'`
  - Will download the video as `Silex and the city - Enchères et en os (2013) [arte].mp4` in best quality.

- `arte7dl -q 800 --title '%title% ARTE' 'http://www.arte.tv/guide/fr/048707-028/silex-and-the-city'`
  - Will download the video as `Silex and the city ARTE.mp4` in worst quality.

*NOTE*: This script is for PERSONAL USE ONLY.