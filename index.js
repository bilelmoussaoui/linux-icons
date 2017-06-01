const {
  execSync
} = require('child_process')
const ini = require('ini')
const os = require('os')
const path = require('path')
const fs = require('fs')
const svg2png = require('svg2png')

const HOME = os.homedir()

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

const ACTIONS_CONTEXT = 'actions'
const ANIMATIONS_CONTEXT = 'animations'
const APPLICATIONS_CONTEXT = 'applications'
const CATEGORIES_CONTEXT = 'categories'
const DEVICES_CONTEXT = 'devices'
const EMBLEMS_CONTEXT = 'emblems'
const EMOTES_CONTEXT = 'emotes'
const MIMETYPES_CONTEXT = 'mimetypes'
const PANEL_CONTEXT = 'panel'
const PLACES_CONTEXT = 'places'
const STATUS_CONTEXT = 'status'

function getIconThemeName () {
  /*
    Return default icon theme name
    Read the gsettings and get the icon name uses by the user
  */

  let key = 'icon-theme'
  let path = 'org.gnome.desktop.interface'
  try {
    let theme = execSync('gsettings get ' + path + ' ' + key).toString()
    return theme.trim().replace(/'/g, '')
  } catch (err) {
    console.log(err.args)
    return null
  }
}

function parseTheme (themePath) {
  /*
    Read the index.theme and return it's content
    index.theme file is a simple ini file
  */
  let index = path.join(themePath, 'index.theme')
  if (fs.existsSync(index)) {
    let content = ini.parse(fs.readFileSync(index, 'utf-8'))
    return content
  }
}

function getTheme (themeName) {
  /*
    Looks for a theme name on the standard icon locations
  */

  let theme
  for (let i = 0; i < ICONS_PATH.length; i++) {
    let themePath = path.join(ICONS_PATH[i], themeName)
    if (fs.existsSync(themePath)) {
      theme = {
        path: themePath,
        context: parseTheme(themePath)
      }
      if (theme != null || undefined) {
        return theme
      }
    }
  }
  return null
}

function getIconFromTheme (theme, iconName, size, context) {
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

      if (context.includes($context) && ($minSize <= size <= $maxSize || $size === size)) {
        let iconDirectory = path.join(theme.path, key)
        let iconPath
        for (let ext in supportedExtension) {
          iconPath = path.join(iconDirectory, iconName + '.' + supportedExtension[ext])
          if (fs.existsSync(iconPath)) {
            return fs.realpathSync(iconPath)
          }
        }
      }
    }
  }
  return null
}

function getImageBuffer (iconPath, size) {
  if (path.extname(iconPath).toLowerCase() === '.svg') {
    return svg2png.sync(fs.readFileSync(iconPath), {
      'width': size,
      'height': size
    })
  } else {
    return fs.readFile(iconPath)
  }
}

function getIconPath (iconName, size, context) {
  // Throw an err as the plugin should be only used on linux
  if (os.type().toLowerCase() !== 'linux') {
    throw Error('getIcon is only supported on linux.')
  }

  // get the default theme object
  let defaultTheme = getTheme(getIconThemeName())
  let inherits = defaultTheme.context['Icon Theme']['Inherits'].split(',')

  let icon = getIconFromTheme(defaultTheme, iconName, size, context)

  if (icon !== null) {
    return icon
  }

  /*
    In case the icon wasn't found on the icon theme's path
    we look into the icon theme's inherits
  */
  for (let key in inherits) {
    let inheritsTheme = getTheme(inherits[key])
    icon = getIconFromTheme(inheritsTheme, iconName, size, context)
    if (icon !== null) {
      return icon
    }
  }

  return null
}

module.exports.getIconBuffer = (iconName, size = 22, context = STATUS_CONTEXT) => {
  return getImageBuffer(getIconPath(iconName, size, context))
}

module.exports.getIcon = (iconName, size = 22, context = STATUS_CONTEXT) => {
  return getIconPath(iconName, size, context)
}

module.exports.Context = {
  ACTIONS: ACTIONS_CONTEXT,
  ANIMATIONS: ANIMATIONS_CONTEXT,
  APPLICATIONS: APPLICATIONS_CONTEXT,
  CATEGORIES: CATEGORIES_CONTEXT,
  DEVICES: DEVICES_CONTEXT,
  EMBLEMS: EMBLEMS_CONTEXT,
  EMOTES: EMOTES_CONTEXT,
  MIMETYPES: MIMETYPES_CONTEXT,
  PANEL: PANEL_CONTEXT,
  PLACES: PLACES_CONTEXT,
  STATUS: STATUS_CONTEXT
}
