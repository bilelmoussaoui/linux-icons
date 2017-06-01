# linux-icons
[![Build Status](https://travis-ci.org/bil-elmoussaoui/linux-icons.svg?branch=master)](https://travis-ci.org/bil-elmoussaoui/linux-icons)
Use Native Linux icons on NodeJS


Improve Linux support on your NodeJS application by using system icon themes. The icons should be placed under one of the freedesktop icons location standards like `/usr/share/icons/hicolor/`

## Status

The current version supports:

- Inherits
- Sizes (SVG icons are resized when using `getIconBuffer`)
- Icon [Contexts](https://standards.freedesktop.org/icon-naming-spec/icon-naming-spec-latest.html#context)

## How to use

Install the package

```bash
npm install --save linux-icons
```

In order to get the full path of an icon

```javascript
const icons = require('linux-icons')

let iconPath = icons.getIcon('myicon-name', 22, icons.Context.STATUS)
```

Or to get the buffer of it

```javascript
const icons = require('linux-icons')

let icon = icons.getIconBuffer('myicon-name', 22, icons.Context.STATUS)
```

Note: Electron tray icons does not support SVG icons. You will have to use `getIconBuffer` with `nativeImage.createFromBuffer`. See the examples folder.


## TODO

- [ ] Auto-detect the DE and get the right icon theme name
- [ ] Make the icon size & the context optional
- [ ] Async version
- [ ] Clean the code!
- [ ] Scaling Factor
