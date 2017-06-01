const {
  app,
  Tray,
  Menu,
  BrowserWindow,
  nativeImage
} = require('electron')
const icons = require('linux-icons')

// Sync Example
let buffer = icons.getIconBuffer.sync('google-chrome-tray', 22, [icons.Context.STATUS,
  icons.Context.PANEL
])
let icon = nativeImage.createFromBuffer(buffer)

let win

app.on('ready', function () {
  let tray = new Tray(icon)
  win = new BrowserWindow({
    show: true
  })
  let contextMenu = Menu.buildFromTemplate([{
    label: 'Quit',
    accelerator: 'Command+Q',
    selector: 'terminate:'
  }])

  tray.setToolTip('This is my application.')
  tray.setContextMenu(contextMenu)
})

app.on('activate', () => {
  win.show()
})
