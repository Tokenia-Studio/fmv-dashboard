// Loader minimo para que Node resuelva imports sin extension (.js)
// como hace Vite. Solo se usa en scripts CLI.
import { existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve as resolvePath } from 'path'

export async function resolve(specifier, context, nextResolve) {
  if ((specifier.startsWith('./') || specifier.startsWith('../')) && !/\.\w+$/.test(specifier)) {
    const parentDir = dirname(fileURLToPath(context.parentURL))
    const candidateJs = resolvePath(parentDir, specifier + '.js')
    if (existsSync(candidateJs)) {
      return nextResolve(specifier + '.js', context)
    }
  }
  return nextResolve(specifier, context)
}
