import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse } from 'yaml'
import Ajv2020 from 'ajv/dist/2020'
import addFormats from 'ajv-formats'
import { expect } from 'vitest'

type Json = Record<string, unknown>

const doc = parse(readFileSync(resolve(__dirname, '../../contracts/openapi.yaml'), 'utf8')) as Json
const ajv = new Ajv2020({ strict: false, allErrors: true })
addFormats(ajv)
const DOC_ID = 'https://contract.local/openapi'
ajv.addSchema(doc, DOC_ID)
const cache = new Map<string, ReturnType<typeof ajv.compile>>()

function deref(node: Json): Json {
  const ref = node.$ref
  if (typeof ref !== 'string') return node
  return ref
    .replace(/^#\//, '')
    .split('/')
    .reduce<Json>((n, k) => n[k] as Json, doc)
}

/** Validates a response body against the contract for (method, path template, status). */
export function validateResponse(method: string, path: string, status: number, body: unknown): void {
  const op = ((doc.paths as Json)[path] as Json | undefined)?.[method.toLowerCase()] as Json | undefined
  if (!op) throw new Error(`No operation ${method} ${path} in contract`)
  const responses = op.responses as Json
  const declared = responses[String(status)] as Json | undefined
  expect(declared, `${method} ${path} does not declare status ${status}`).toBeDefined()
  const response = deref(declared!)
  const content = response.content as Json | undefined
  const media = (content?.['application/json'] ?? content?.['application/problem+json']) as Json | undefined
  if (!media) return
  const schema = media.schema as Json
  const cacheKey = `${method} ${path} ${status}`
  let validate = cache.get(cacheKey)
  if (!validate) {
    validate = ajv.compile(rewriteRefs(schema) as Json)
    cache.set(cacheKey, validate)
  }
  const ok = validate(body)
  expect(validate.errors ?? [], `${method} ${path} ${status} violates contract`).toEqual([])
  expect(ok).toBe(true)
}

function rewriteRefs(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(rewriteRefs)
  if (node && typeof node === 'object') {
    return Object.fromEntries(
      Object.entries(node).map(([k, v]) => [k, k === '$ref' && typeof v === 'string' ? `${DOC_ID}${v}` : rewriteRefs(v)]),
    )
  }
  return node
}

export const BASE = 'http://localhost/api'

export async function call(method: string, url: string, init: { body?: unknown; headers?: Record<string, string> } = {}) {
  const res = await fetch(`${BASE}${url}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...init.headers },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  })
  const text = await res.text()
  return { status: res.status, headers: res.headers, body: text ? (JSON.parse(text) as unknown) : undefined }
}
