export type JavaModelStyle = 'record' | 'pojo'

export type JavaModelOptions = {
  className?: string
  style?: JavaModelStyle
}

type JavaType =
  | { kind: 'model'; name: string; fields: JavaField[] }
  | { kind: 'list'; item: JavaType }
  | { kind: 'scalar'; name: 'String' | 'Boolean' | 'Integer' | 'Long' | 'BigDecimal' | 'Object' }

type JavaField = {
  jsonName: string
  javaName: string
  type: JavaType
}

const javaKeywords = new Set([
  'abstract', 'assert', 'boolean', 'break', 'byte', 'case', 'catch', 'char', 'class',
  'const', 'continue', 'default', 'do', 'double', 'else', 'enum', 'extends', 'final',
  'finally', 'float', 'for', 'goto', 'if', 'implements', 'import', 'instanceof', 'int',
  'interface', 'long', 'native', 'new', 'package', 'private', 'protected', 'public',
  'return', 'short', 'static', 'strictfp', 'super', 'switch', 'synchronized', 'this',
  'throw', 'throws', 'transient', 'try', 'void', 'volatile', 'while', 'true', 'false',
  'null', '_', 'exports', 'module', 'open', 'opens', 'provides', 'requires', 'to',
  'transitive', 'uses', 'with', 'var', 'yield', 'record', 'sealed', 'permits',
  'clone', 'equals', 'finalize', 'getClass', 'hashCode', 'notify', 'notifyAll',
  'toString', 'wait',
])

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function words(value: string): string[] {
  const normalized = value.normalize('NFKD').replace(/\p{M}/gu, '')
  return normalized.match(/[A-Za-z0-9]+/g) ?? []
}

function uniqueName(name: string, used: Set<string>): string {
  let candidate = name
  let suffix = 2
  while (used.has(candidate)) {
    candidate = `${name}${suffix}`
    suffix += 1
  }
  used.add(candidate)
  return candidate
}

function fieldIdentifier(value: string): string {
  if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(value) && !javaKeywords.has(value)) return value

  const parts = words(value)
  let identifier = parts.length === 0
    ? 'field'
    : parts.map((part, index) => {
      const lower = part.toLowerCase()
      return index === 0 ? lower : `${lower[0].toUpperCase()}${lower.slice(1)}`
    }).join('')

  if (/^[0-9]/.test(identifier)) identifier = `field${identifier[0].toUpperCase()}${identifier.slice(1)}`
  if (javaKeywords.has(identifier)) identifier = `${identifier}Field`
  return identifier
}

function classIdentifier(value: string): string {
  const parts = words(value)
  let identifier = parts.map((part) => `${part[0].toUpperCase()}${part.slice(1)}`).join('')
  if (!identifier) identifier = 'GeneratedModel'
  if (/^[0-9]/.test(identifier)) identifier = `Type${identifier}`
  if (javaKeywords.has(identifier.toLowerCase())) identifier = `${identifier}Model`
  return identifier
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number'
}

function numberType(value: number): 'Integer' | 'Long' | 'BigDecimal' {
  if (!Number.isSafeInteger(value)) return 'BigDecimal'
  if (value >= -2147483648 && value <= 2147483647) return 'Integer'
  return 'Long'
}

function inferType(values: readonly unknown[], suggestedName: string, usedModelNames: Set<string>): JavaType {
  const present = values.filter((value) => value !== null)
  if (present.length === 0) return { kind: 'scalar', name: 'Object' }

  const kinds = new Set(present.map((value) => Array.isArray(value) ? 'array' : typeof value))
  if (kinds.size !== 1) return { kind: 'scalar', name: 'Object' }

  const kind = kinds.values().next().value
  if (kind === 'string') return { kind: 'scalar', name: 'String' }
  if (kind === 'boolean') return { kind: 'scalar', name: 'Boolean' }
  if (kind === 'number') {
    const rank = { Integer: 0, Long: 1, BigDecimal: 2 }
    const name = present
      .filter(isNumber)
      .map(numberType)
      .sort((left, right) => rank[right] - rank[left])[0]
    return { kind: 'scalar', name: name ?? 'Object' }
  }
  if (kind === 'array') {
    const items = present.flatMap((value) => Array.isArray(value) ? value : [])
    return {
      kind: 'list',
      item: inferType(items, `${suggestedName}Item`, usedModelNames),
    }
  }
  if (kind !== 'object') return { kind: 'scalar', name: 'Object' }

  const modelName = uniqueName(suggestedName, usedModelNames)
  const objects = present.filter(isJsonObject)
  const keys = [...new Set(objects.flatMap((value) => Object.keys(value)))].sort()
  const usedFields = new Set<string>()
  const nestedNames = new Set([modelName])
  const fields = keys.map((jsonName) => {
    const javaName = uniqueName(fieldIdentifier(jsonName), usedFields)
    const fieldValues = objects
      .filter((object) => Object.hasOwn(object, jsonName))
      .map((object) => object[jsonName])
    return {
      jsonName,
      javaName,
      type: inferType(fieldValues, classIdentifier(javaName), nestedNames),
    }
  })

  return { kind: 'model', name: modelName, fields }
}

function javaString(value: string): string {
  const escaped = Array.from(value, (character) => {
    if (character === '\\') return '\\\\'
    if (character === '"') return '\\"'
    if (character === '\n') return '\\n'
    if (character === '\r') return '\\r'
    if (character === '\t') return '\\t'
    if (character === '\b') return '\\b'
    if (character === '\f') return '\\f'
    const code = character.charCodeAt(0)
    if (code <= 0x1f || code === 0x7f) return `\\${code.toString(8).padStart(3, '0')}`
    return character
  }).join('')
  return `"${escaped}"`
}

function javaTypeName(type: JavaType): string {
  if (type.kind === 'model') return type.name
  if (type.kind === 'list') return `List<${javaTypeName(type.item)}>`
  return type.name
}

function nestedModels(type: JavaType): Extract<JavaType, { kind: 'model' }>[] {
  if (type.kind === 'model') return [type]
  if (type.kind === 'list') return nestedModels(type.item)
  return []
}

function collectImports(type: JavaType, imports: Set<string>): void {
  if (type.kind === 'list') {
    imports.add('java.util.List')
    collectImports(type.item, imports)
    return
  }
  if (type.kind === 'scalar') {
    if (type.name === 'BigDecimal') imports.add('java.math.BigDecimal')
    return
  }

  for (const field of type.fields) {
    if (field.javaName !== field.jsonName) imports.add('com.fasterxml.jackson.annotation.JsonProperty')
    collectImports(field.type, imports)
  }
}

function renderModel(
  model: Extract<JavaType, { kind: 'model' }>,
  style: JavaModelStyle,
  isRoot: boolean,
  depth: number,
): string[] {
  const indent = ' '.repeat(depth)
  const innerIndent = ' '.repeat(depth + 4)
  const lines: string[] = []

  if (style === 'record') {
    if (model.fields.length === 0) {
      lines.push(`${indent}public record ${model.name}() {`)
    } else {
      lines.push(`${indent}public record ${model.name}(`)
      for (const [index, field] of model.fields.entries()) {
        if (field.javaName !== field.jsonName) {
          lines.push(`${innerIndent}@JsonProperty(${javaString(field.jsonName)})`)
        }
        const comma = index < model.fields.length - 1 ? ',' : ''
        lines.push(`${innerIndent}${javaTypeName(field.type)} ${field.javaName}${comma}`)
      }
      lines.push(`${indent}) {`)
    }
  } else {
    lines.push(`${indent}public ${isRoot ? '' : 'static '}class ${model.name} {`)
    for (const field of model.fields) {
      if (field.javaName !== field.jsonName) {
        lines.push(`${innerIndent}@JsonProperty(${javaString(field.jsonName)})`)
      }
      lines.push(`${innerIndent}private ${javaTypeName(field.type)} ${field.javaName};`)
    }
    lines.push('')
    lines.push(`${innerIndent}public ${model.name}() {}`)
    for (const field of model.fields) {
      const suffix = `${field.javaName[0].toUpperCase()}${field.javaName.slice(1)}`
      const typeName = javaTypeName(field.type)
      lines.push('')
      lines.push(`${innerIndent}public ${typeName} get${suffix}() {`)
      lines.push(`${innerIndent}    return ${field.javaName};`)
      lines.push(`${innerIndent}}`)
      lines.push('')
      lines.push(`${innerIndent}public void set${suffix}(${typeName} ${field.javaName}) {`)
      lines.push(`${innerIndent}    this.${field.javaName} = ${field.javaName};`)
      lines.push(`${innerIndent}}`)
    }
    lines.push('')
  }

  const children = model.fields.flatMap((field) => nestedModels(field.type))
  for (const child of children) {
    lines.push('')
    lines.push(...renderModel(child, style, false, depth + 4))
  }
  lines.push(`${indent}}`)
  return lines
}

export function generateJavaModel(source: string, options: JavaModelOptions = {}): string {
  let parsed: unknown
  try {
    parsed = JSON.parse(source)
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'The input could not be parsed.'
    throw new Error(`Invalid JSON: ${detail}`)
  }
  if (!isJsonObject(parsed)) {
    throw new Error('The top-level JSON value must be an object to generate a Java model.')
  }

  const rootName = classIdentifier(options.className?.trim() || 'GeneratedModel')
  const root = inferType([parsed], rootName, new Set())
  if (root.kind !== 'model') throw new Error('Could not generate a Java model from this object.')

  const imports = new Set<string>()
  collectImports(root, imports)
  const lines = [...[...imports].sort().map((item) => `import ${item};`)]
  if (lines.length > 0) lines.push('')
  lines.push(...renderModel(root, options.style ?? 'record', true, 0))
  return lines.join('\n')
}
