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

const SUPPORTED_EXTENSIONS = ['.svg', '.png']

function isLinux () {
  /**
   * @desc Checks if the current os is Linux or not
   * @return bool - success or failure
   */
  return os.type().toLowerCase() === 'linux'
}

function getIconThemeCMD () {
  /**
   * @desc The exact command to run to get the current icon theme
   * @return string - the command
   */
  let desktop = process.env.XDG_CURRENT_DESKTOP
  let key, path
  switch (desktop) {
    case 'GNOME':
      key = 'icon-theme'
      path = 'org.gnome.desktop.interface'
  }
  return `gsettings get ${path} ${key}`
}

function getIconThemeName (callback) {
  /**
   * @desc Gets the current icon theme name
   * @param Promise callback - callback (iconName)
   */
  exec(getIconThemeCMD(), (error, stdout) => {
    if (error !== null) {
      console.error(error)
    }
    callback(stdout.trim().replace(/'/g, ''))
  })
}

function getIconThemeNameSync () {
  /**
   * @desc Gets the current icon theme name
   * @return string - The icon theme name
   */
  try {
    return execSync(getIconThemeCMD()).toString().trim().replace(/'/g, '')
  } catch (err) {
    console.log(err.args)
    return null
  }
}

function parseTheme (themePath, callback) {
  /**
   * @desc Get the information about the theme (stored on index.theme)
   * @param string themePath - the absolute path to the theme directory
   * @param Promise callback - callback (index.theme's content)
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
  /**
   * @desc Get the information about the theme (stored on index.theme)
   * @param string themePath - the absolute path to the theme directory
   * @return object - the content of the index.theme file (ini file)
   */
  let index = path.join(themePath, 'index.theme')
  if (fs.existsSync(index)) {
    return readINI.sync(index)
  }
}

function getTheme (themeName, callback) {
  /**
   * @desc Looks for a theme on the freedesktop standard icons locations
   * @param string themeName - The icon theme name
   * @param Promise callback -  callback (theme object)
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
  /**
   * @desc Looks for a theme on the freedesktop standard icons locations
   * @param string themeName - The icon theme name
   * @return object theme - contains the path of the theme & it's content
   */
  for (let i = 0; i < ICONS_PATH.length; i++) {
    let themePath = path.join(ICONS_PATH[i], themeName)
    if (fs.existsSync(themePath)) {
      let context = parseThemeSync(themePath)
      if (context != null || undefined) {
        return {
          path: themePath,
          context: context
        }
      }
    }
  }
  return null
}

function getIconFromTheme (theme, iconName, size, context, callback) {
  /**
   * @desc Gets the icon path from a theme if the icon found
   * @param theme theme - Theme object contains path & context attrs
   * @param string iconName - The icon name to look for
   * @param int size - the icon size
   * @param object context - the context of the icon
   * @param Promise callback - callback(iconPath)
   */
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
    /**
   * @desc Gets the icon path from a theme if the icon found
   * @param theme theme - Theme object contains path & context attrs
   * @param string iconName - The icon name to look for
   * @param int size - the icon size
   * @param object context - the context of the icon
   * @return string - the real path of the icon if found
   */
  let icons = __getIconsPaths(theme, iconName, size, context)
  for (let key in icons) {
    let iconPath = icons[key]
    if (fs.existsSync(iconPath)) {
      return fs.realpathSync(iconPath)
    }
  }
  return null
}

function getImageBuffer (iconPath, size, callback) {
  /**
   * @desc Get the svg/png image buffer
   * @param string iconPath - the icon path
   * @param int size - the icon size
   * @param Promise callback - callback(buffer)
   */
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
    /**
   * @desc Get the svg/png image buffer
   * @param string iconPath - the icon path
   * @param int size - the icon size
   * @return buffer
   */
  if (path.extname(iconPath).toLowerCase() === '.svg') {
    return svg2png.sync(fs.readFileSync(iconPath), {
      'width': size,
      'height': size
    })
  } else {
    return fs.readFileSync(iconPath)
  }
}

function getIconPath (iconName, size, context, callback) {
  /**
   * @desc Get the icon's absolute path by looking on the theme's content
   * @param string iconName - an icon name
   * @param int size - the icon size
   * @param Context context - the icon context (see freedesktop specifications)
   * @param Promise callback - callback(iconPath)
   */
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
  /**
   * @desc Get the icon's absolute path by looking on the theme's content
   * @param string iconName - an icon name
   * @param int size - the icon size
   * @param Context context - the icon context (see freedesktop specifications)
   * @return string - the icon absolute path
   */
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
  /**
   * @desc Reads the theme data,
   *      & looks for possible icons on the theme's subdirs
   * @param Theme theme : theme object
   * @param string iconName: the icon name
   * @param int size: the icon size
   * @param Context context: the icon context
   * @return Array - a list of icons paths
   */

  let icons = []
  if (typeof (context) !== 'object') {
    context = [context]
  }
  context = context.map(element => {
    return element.toLowerCase()
  })

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
          for (let ext in SUPPORTED_EXTENSIONS) {
            icons.push(path.join(iconDirectory, iconName + SUPPORTED_EXTENSIONS[ext]))
          }
        }
      }
    }
  }
  return icons
}

module.exports.getIconBuffer = (iconName, size = 22, context = Context.STATUS, callback) => {
  /**
   * @desc Looks for an icon on the current theme
   * @param string iconName - the icon name (without any extension)
   * @param int size - the icon size
   * @param Context context - the icon context (freedesktop standards)
   * @param Promise callback - callback (Buffer)
   */
  if (!isLinux()) {
    throw Error('getIconBuffer is only supported on linux.')
  }

  getIconPath(iconName, size, context, (iconPath) => {
    getImageBuffer(iconPath, size, (buffer) => {
      callback(buffer)
    })
  })
}

module.exports.getIcon = (iconName, size = 22, context = Context.STATUS, callback) => {
  /**
 * @desc Looks for an icon on the current theme
 * @param string iconName - the icon name (without any extension)
 * @param int size - the icon size
 * @param Context context - the icon context (freedesktop standards)
 * @param Promise callback - callback (iconPath)
 */
  if (!isLinux()) {
    throw Error('getIcon is only supported on linux.')
  }

  getIconPath(iconName, size, context, (iconPath) => {
    callback(iconPath)
  })
}

module.exports.getIconBuffer.sync = (iconName, size = 22, context = Context.STATUS) => {
  /**
 * @desc Looks for an icon on the current theme & return the icon buffer
 * @param string iconName - the icon name (without any extension)
 * @param int size - the icon size
 * @param Context context - the icon context (freedesktop standards)
 * @return Buffer
 */
  if (!isLinux()) {
    throw Error('getIconBuffer.sync is only supported on linux.')
  }

  return getImageBufferSync(getIconPathSync(iconName, size, context))
}

module.exports.getIcon.sync = (iconName, size = 22, context = Context.STATUS) => {
  /**
 * @desc Looks for an icon on the current theme & return the icon path
 * @param string iconName - the icon name (without any extension)
 * @param int size - the icon size
 * @param Context context - the icon context (freedesktop standards)
 * @return string - the icon path
 */
  if (!isLinux()) {
    throw Error('getIcon.sync is only supported on linux.')
  }

  return getIconPathSync(iconName, size, context)
}

module.exports.Context = Context
