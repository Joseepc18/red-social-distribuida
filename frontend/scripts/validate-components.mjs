import ts from 'typescript'
import { readdirSync, readFileSync } from 'node:fs'
import { basename, join } from 'node:path'
const files = ['src/components', 'src/pages'].flatMap((dir) => readdirSync(dir).filter((name) => name.endsWith('.tsx') && !name.endsWith('.test.tsx')).map((name) => join(dir, name)))
let failed = false
for (const file of files) {
  const source = readFileSync(file, 'utf8')
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const expected = basename(file, '.tsx') + 'Props'
  const hasProps = ast.statements.some((node) => ts.isInterfaceDeclaration(node) && node.name.text === expected)
  if (!hasProps || /#[0-9a-f]{3,8}\b/i.test(source) || /href=["']#["']/.test(source)) {
    console.error('Invalid component:', file)
    failed = true
  }
}
if (failed) process.exit(1)
console.log(files.length + ' componentes: interfaces, estilos y enlaces verificados.')
