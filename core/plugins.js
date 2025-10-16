import { readdirSync, mkdirSync, existsSync } from 'fs'
import { join, resolve, extname, basename } from 'path'
import { pathToFileURL } from 'url'
import chokidar from 'chokidar'

export default class PluginsLoad {
  constructor(directory, { debug = false, logger = console } = {}) {
    this.directory = resolve(directory)
    this.debug = debug
    this.logger = logger
    this.plugins = new Map()
    this.watcher = null

    if (!existsSync(this.directory)) {
      mkdirSync(this.directory, { recursive: true })
      this.logger.info(`📁 Created plugins directory: ${this.directory}`)
    }
  }

  async add(modulePath, { silent = false } = {}) {
    const resolvedPath = resolve(modulePath)

    try {
      const importUrl = pathToFileURL(resolvedPath).href + '?id=' + Date.now()
      const module = await import(importUrl)

      const exported = module.default || module

      if (!exported || (typeof exported !== 'object' && typeof exported !== 'function')) {
        throw new Error('No valid exports found')
      }

      const pluginData = {
        name: exported.name || basename(resolvedPath, '.js'),
        path: resolvedPath,
        module: exported,
        loadedAt: Date.now(),
      }

      this.plugins.set(resolvedPath, pluginData)

      return exported
    } catch (error) {
      this.plugins.delete(resolvedPath)
      if (!silent) {
        this.logger.error(`❌ Failed to load plugin ${resolvedPath}:`, error.message)
      }
      return null
    }
  }

  async scan(dir = this.directory) {
    let loaded = 0

    try {
      const items = readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
        a.name.localeCompare(b.name),
      )

      for (const item of items) {
        const fullPath = join(dir, item.name)

        if (item.isDirectory()) {
          loaded += await this.scan(fullPath)
        } else if (item.isFile() && extname(item.name) === '.js') {
          await this.add(fullPath, { silent: true })
          loaded++
        }
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        this.logger.info(`📁 Plugins folder empty: ${dir}`)
      } else {
        this.logger.error(`Scan error in ${dir}:`, error.message)
      }
    }

    return loaded
  }

  async load({ watch = true } = {}) {
    if (this.watcher) {
      await this.watcher.close()
    }

    const count = await this.scan()

    if (watch) {
      this.watcher = chokidar.watch(this.directory, {
        ignored: /(^|[\/\\])\../,
        persistent: true,
        awaitWriteFinish: {
          stabilityThreshold: 300,
          pollInterval: 100,
        },
      })

      this.watcher
        .on('add', path => {
          if (path.endsWith('.js')) {
            this.add(path)
          }
        })
        .on('change', path => {
          if (path.endsWith('.js')) {
            this.logger.info(`🔄 Reloading plugin: ${path}`)
            this.add(path)
          }
        })
        .on('unlink', path => {
          const resolvedPath = resolve(path)
          if (this.plugins.has(resolvedPath)) {
            const plugin = this.plugins.get(resolvedPath)
            this.logger.info(`🗑️ Plugin removed: ${plugin.name}`)
            this.plugins.delete(resolvedPath)
          }
        })
        .on('error', error => {
          this.logger.error('Watcher error:', error)
        })

      if (this.debug) {
        this.logger.info(`👀 Watching for changes in: ${this.directory}`)
      }
    }
  }

  get(identifier) {
    const resolvedPath = resolve(identifier)
    if (this.plugins.has(resolvedPath)) {
      return this.plugins.get(resolvedPath)
    }

    for (const plugin of this.plugins.values()) {
      if (plugin.name === identifier) {
        return plugin
      }
    }
  }

  list() {
    return Array.from(this.plugins.values()).map(plugin => ({
      name: plugin.name,
      path: plugin.path,
      loadedAt: plugin.loadedAt,
    }))
  }

  async close() {
    if (this.watcher) {
      await this.watcher.close()
      this.watcher = null
    }
  }
}
