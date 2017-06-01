const {
  exec,
  execSync
} = require('child_process')
const readINI = require('utils-fs-read-ini')
const os = require('os')
const path = require('path')
const fs = require('fs')
const svg2png = require('svg2png')


// Home directory
const HOME = os.homedir()
// List of possible icons paths
const ICONS_PATH = [
  '/usr/share/icons/',
  '/usr/local/share/icons/',
  '/usr/share/pixmaps/',
  '/usr/local/share/pixmaps/',
  path.join(HOME, '.icons/'),
  path.join(HOME, '.local/share/icons/'),
  path.join(HOME, '.local/share/pixmaps/'),
  path.join(HOME, '.pixmaps/')
]

// Icons contexts freedestkop standards
const Context = {
  ACTIONS: 'actions',
  ANIMATIONS: 'animations',
  APPLICATIONS: 'applications',
  CATEGORIES: 'categories',
  DEVICES: 'devices',
  EMBLEMS: 'emblems',
  EMOTES: 'emotes',
  INTERNATIONAL: 'international',
  MIMETYPES: 'mimetypes',
  PANEL: 'panel',
  PLACES: 'places',
  STATUS: 'status'
}

function getIconThemeCMD() {
  let desktop = process.env.XDG_CURRENT_DESKTOP
  let key, path
  switch (desktop) {
    case "GNOME":
      key = "icon-theme"
      path = "org.gnome.desktop.interface"
  }
  return `gsettings get ${path} ${key}`
}


function getIconThemeName(callback) {
  /*
    Return default icon theme name
    Read the gsettings and get the icon name uses by the user
  */
  exec(getIconThemeCMD(), (error, stdout) => {
    if (error !== null) {
      console.error(error)
    }
    callback(stdout.trim().replace(/'/g, ''))
  })
}

function getIconThemeNameSync () {
  /*
    Return default icon theme name
    Read the gsettings and get the icon name uses by the user
  */
  try {
    return execSync(getIconThemeCMD()).toString().trim().replace(/'/g, '')
  } catch (err) {
    console.log(err.args)
    return null
  }
}

// Async
function parseTheme (themePath, callback) {
  /*
    Read the index.theme and return it's content
    index.theme file is a simple ini file
  */
  readINI(path.join(themePath, 'index.theme'), (error, data) => {
    if (error !== null) {
      if (error.code === 'ENOENT') {
        return
      }
      console.error(error)
    }
    callback(data)
  })
}

function parseThemeSync (themePath) {
  /*
    Read the index.theme and return it's content
    index.theme file is a simple ini file
  */
  let index = path.join(themePath, 'index.theme')
  if (fs.existsSync(index)) {
    let content = readINI.sync(index)
    return content
  }
}

// Async
function getTheme (themeName, callback) {
  /*
    Looks for a theme name on the standard icon locations
  */
  for (let i = 0; i < ICONS_PATH.length; i++) {
    let themePath = path.join(ICONS_PATH[i], themeName)
    parseTheme(themePath, (data) => {
      if (data !== null) {
        let theme = {
          path: themePath,
          context: data
        }
        callback(theme)
      }
    })
  }
}

function getThemeSync (themeName) {
  /*
    Looks for a theme name on the standard icon locations
  */

  let theme
  for (let i = 0; i < ICONS_PATH.length; i++) {
    let themePath = path.join(ICONS_PATH[i], themeName)
    if (fs.existsSync(themePath)) {
      theme = {
        path: themePath,
        context: parseThemeSync(themePath)
      }
      if (theme != null || undefined) {
        return theme
      }
    }
  }
  return null
}

// Async
function getIconFromTheme (theme, iconName, size, context, callback) {
  let icons = __getIconsPaths(theme, iconName, size, context)
  for (let key in icons) {
    fs.realpath(icons[key], (error, resolvedPath) => {
      if (error !== null) {
        if (error.code === 'ENOENT') {
          return
        }
      }
      callback(resolvedPath)
    })
  }
}

function getIconFromThemeSync (theme, iconName, size, context) {
  let icons = __getIconsPaths(theme, iconName, size, context)
  for (let key in icons) {
    let iconPath = icons[key]
    if (fs.existsSync(iconPath)) {
      return fs.realpathSync(iconPath)
    }
  }
  return null
}

// Async
function getImageBuffer (iconPath, size, callback) {
  if (path.extname(iconPath).toLowerCase() === '.svg') {
    fs.readFile(iconPath, (error, buffer) => {
      if (error !== null) {
        if (error.code === 'ENOENT') {
          console.error(iconPath + ' does not exist')
          return
        }
      }
      svg2png(buffer, {
        'width': size,
        'height': size
      }).then(buffer => {
        callback(buffer)
      }).catch(e => console.error(e))
    })
  } else {
    fs.readFile(iconPath, (error, buffer) => {
      if (error !== null) {
        if (error.code === 'ENOENT') {
          console.error(iconPath + ' does not exist')
          return
        }
      }
      callback(buffer)
    })
  }
}

function getImageBufferSync (iconPath, size) {
  if (path.extname(iconPath).toLowerCase() === '.svg') {
    return svg2png.sync(fs.readFileSync(iconPath), {
      'width': size,
      'height': size
    })
  } else {
    return fs.readFileSync(iconPath)
  }
}

// Async

function getIconPath (iconName, size, context, callback) {
  // Throw an err as the plugin should be only used on linux
  if (os.type().toLowerCase() !== 'linux') {
    throw Error('getIcon is only supported on linux.')
  }

  // get the default theme object
  getIconThemeName(name => {
    getTheme(name, theme => {
      let inherits = theme.context['Icon Theme']['Inherits'].split(',')
      getIconFromTheme(theme, iconName, size, context, icon => {
        if (icon !== null) {
          callback(icon)
        }
      })
      /*
        In case the icon wasn't found on the icon theme's path
        we look into the icon theme's inherits
      */
      for (let key in inherits) {
        getTheme(inherits[key], theme => {
          getIconFromTheme(theme, iconName, size, context, icon => {
            if (icon !== null) {
              callback(icon)
            }
          })
        })
      }
    })
  })
}

function getIconPathSync (iconName, size, context) {
  // Throw an err as the plugin should be only used on linux
  if (os.type().toLowerCase() !== 'linux') {
    throw Error('getIcon is only supported on linux.')
  }

  // get the default theme object
  let defaultTheme = getThemeSync(getIconThemeNameSync())
  let inherits = defaultTheme.context['Icon Theme']['Inherits'].split(',')

  let icon = getIconFromThemeSync(defaultTheme, iconName, size, context)

  if (icon !== null) {
    return icon
  }

  /*
    In case the icon wasn't found on the icon theme's path
    we look into the icon theme's inherits
  */
  for (let key in inherits) {
    let inheritsTheme = getThemeSync(inherits[key])
    icon = getIconFromThemeSync(inheritsTheme, iconName, size, context)
    if (icon !== null) {
      return icon
    }
  }

  return null
}

function __getIconsPaths (theme, iconName, size, context) {
  let icons = []
  if (typeof (context) !== 'object') {
    context = [context]
  }
  context = context.map(element => {
    return element.toLowerCase()
  })

  let supportedExtension = ['svg', 'png']

  for (let key in theme.context) {
    if (key !== 'Icon Theme') {
      let $context = theme.context[key]['Context'].toLowerCase()
      let $minSize = parseInt(theme.context[key]['MinSize'])
      let $maxSize = parseInt(theme.context[key]['MaxSize'])
      let $size = parseInt(theme.context[key]['Size'])

      // Hacky fix as we don't support scalable icons yet...
      if (key.indexOf('@') !== -1) {
        if (context.includes($context) && ($minSize <= size <= $maxSize || $size === size)) {
          let iconDirectory = path.join(theme.path, key)
          for (let ext in supportedExtension) {
            icons.push(path.join(iconDirectory, iconName + '.' + supportedExtension[ext]))
          }
        }
      }
    }
  }
  return icons
}

module.exports.getIconBuffer = (iconName, size = 22, context = Context.STATUS, callback) => {
  getIconPath(iconName, size, context, (iconPath) => {
    getImageBuffer(iconPath, size, (buffer) => {
      callback(buffer)
    })
  })
}

module.exports.getIcon = (iconName, size = 22, context = Context.STATUS, callback) => {
  getIconPath(iconName, size, context, (iconPath) => {
    callback(iconPath)
  })
}

module.exports.getIconBuffer.sync= (iconName, size = 22, context = Context.STATUS) => {
  return getImageBufferSync(getIconPathSync(iconName, size, context))
}

module.exports.getIcon.sync = (iconName, size = 22, context = Context.STATUS) => {
  return getIconPathSync(iconName, size, context)
}

module.exports.Context = Context
