const {createClient} = require('@sanity/client')

const APPLY = process.argv.includes('--apply')
const explicitIdArg = process.argv.find((arg) => arg.startsWith('--id='))
const explicitId = explicitIdArg ? explicitIdArg.slice('--id='.length) : undefined
const forceFieldsArg = process.argv.find((arg) => arg.startsWith('--force-fields='))
const forceFields = forceFieldsArg
  ? forceFieldsArg
      .slice('--force-fields='.length)
      .split(',')
      .map((field) => field.trim())
      .filter(Boolean)
  : []
const CLEANABLE_FIELDS = ['description', 'options', 'historyText']

function getClient() {
  try {
    const {getCliClient} = require('sanity/cli')
    return getCliClient({apiVersion: '2026-01-01'}).withConfig({
      useCdn: false,
      perspective: 'raw',
    })
  } catch {
    return createClient({
      projectId: '9pij4ihx',
      dataset: 'production',
      apiVersion: '2026-01-01',
      useCdn: false,
      perspective: 'raw',
      token: process.env.SANITY_AUTH_TOKEN || process.env.SANITY_WRITE_TOKEN,
    })
  }
}

const client = getClient()

function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  )
}

function isValidSpan(child) {
  return (
    isPlainObject(child) &&
    child._type === 'span' &&
    typeof child.text === 'string' &&
    (!child.marks || Array.isArray(child.marks))
  )
}

function isValidBlock(block) {
  return (
    isPlainObject(block) &&
    block._type === 'block' &&
    typeof block._key === 'string' &&
    Array.isArray(block.children) &&
    block.children.every(isValidSpan) &&
    (!block.markDefs || Array.isArray(block.markDefs))
  )
}

function isValidPortableText(value) {
  return value == null || (Array.isArray(value) && value.every(isValidBlock))
}

function isValidOptions(value) {
  return value == null || (Array.isArray(value) && value.every((item) => typeof item === 'string'))
}

function typeLabel(value) {
  if (value == null) return String(value)
  if (Array.isArray(value)) {
    return `array(${value.map((item) => (item && item._type ? item._type : typeof item)).join(', ')})`
  }
  return typeof value
}

async function main() {
  const query = explicitId
    ? '*[_type == "car" && (_id == $id || _id == $draftId)][0]{_id,_rev,name,brand,model,slug,description,options,historyText}'
    : '*[_type == "car" && !(_id in path("versions.**")) && (brand match "Porsche*" || name match "*Porsche*")]{_id,_rev,name,brand,model,slug,description,options,historyText}'

  const result = await client.fetch(
    query,
    explicitId ? {id: explicitId, draftId: explicitId.startsWith('drafts.') ? explicitId : `drafts.${explicitId}`} : {}
  )
  const cars = explicitId ? (result ? [result] : []) : result

  if (cars.length === 0) {
    throw new Error('Aucun document Porsche trouve. Relance avec --id=<documentId> si necessaire.')
  }

  if (cars.length > 1 && !explicitId) {
    console.log('Plusieurs documents Porsche trouves. Relance avec --id=<documentId> pour nettoyer un seul document.')
    console.log(
      cars.map((car) => ({
        _id: car._id,
        name: car.name,
        brand: car.brand,
        model: car.model,
        slug: car.slug?.current,
      }))
    )
    process.exitCode = 1
    return
  }

  const car = cars[0]
  const invalidFields = []

  if (!isValidPortableText(car.description)) invalidFields.push('description')
  if (!isValidOptions(car.options)) invalidFields.push('options')
  if (!isValidPortableText(car.historyText)) invalidFields.push('historyText')

  const unknownForceFields = forceFields.filter((field) => !CLEANABLE_FIELDS.includes(field))
  if (unknownForceFields.length > 0) {
    throw new Error(`Champs non autorises dans --force-fields: ${unknownForceFields.join(', ')}`)
  }

  const fieldsToUnset = Array.from(new Set([...invalidFields, ...forceFields]))

  console.log('Document cible:', {
    _id: car._id,
    name: car.name,
    brand: car.brand,
    model: car.model,
    slug: car.slug?.current,
  })
  console.log('Types stockes:', {
    description: typeLabel(car.description),
    options: typeLabel(car.options),
    historyText: typeLabel(car.historyText),
  })

  if (fieldsToUnset.length === 0) {
    console.log('Aucun champ invalide detecte parmi description, options, historyText.')
    return
  }

  console.log('Champs invalides detectes:', invalidFields)
  if (forceFields.length > 0) {
    console.log('Champs forces via --force-fields:', forceFields)
  }
  console.log('Champs a unset:', fieldsToUnset)

  if (!APPLY) {
    console.log('Dry-run uniquement. Relance avec --apply pour nettoyer le document.')
    return
  }

  if (!client.config().token) {
    throw new Error('Token manquant. Definis SANITY_AUTH_TOKEN ou SANITY_WRITE_TOKEN avant --apply.')
  }

  const updated = await client.patch(car._id).unset(fieldsToUnset).commit({autoGenerateArrayKeys: true})
  console.log('Nettoyage applique:', {
    _id: updated._id,
    _rev: updated._rev,
    unset: fieldsToUnset,
  })
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
