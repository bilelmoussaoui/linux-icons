const { app, Tray, Menu, BrowserWindow, nativeImage } = require('electron')
const icons = require('../../index')


let buffer = icons.getIconBuffer('google-chrome-tray', 22,
  [icons.Context.STATUS,
    icons.Context.PANEL])

let icon = nativeImage.createFromBuffer(buffer)

app.on('ready', function () {
  let win = new BrowserWindow({ show: true })
  let appIcon = new Tray(icon)
  let contextMenu = Menu.buildFromTemplate([
    {
      label: 'Quit',
      accelerator: 'Command+Q',
      selector: 'terminate:'
    }
  ])
  appIcon.setToolTip('This is my application.')
  appIcon.setContextMenu(contextMenu)
})