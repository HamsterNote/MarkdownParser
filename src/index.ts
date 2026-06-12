import { DocumentParser, type ParserInput } from '@hamster-note/document-parser'
import {
  IntermediateDocument,
  IntermediatePage,
  IntermediatePageMap,
  IntermediateParagraph,
  IntermediateText,
  TextDir
} from '@hamster-note/types'
import type { Root } from 'mdast'
import { fromMarkdown } from 'mdast-util-from-markdown'
import { gfmFromMarkdown, gfmToMarkdown } from 'mdast-util-gfm'
import { toMarkdown } from 'mdast-util-to-markdown'
import { gfm } from 'micromark-extension-gfm'
import { isIntermediateTextLike } from './intermediateTextGuard.js'
import { MarkdownDocument } from './MarkdownDocument.js'

export const MARKDOWN_PARSER_PACKAGE_NAME =
  '@hamster-note/markdown-parser' as const

export const markdownParserWorkspaceStatus = 'initialized' as const

export type MarkdownParserInputKind =
  | 'array-buffer'
  | 'array-buffer-view'
  | 'blob'

export interface MarkdownParserInspection {
  byteLength: number
  kind: MarkdownParserInputKind
  message: string
  mimeType: string
  status: 'markdown-supported'
  supportedExtensions: string[]
}

class MarkdownParserError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'MarkdownParserError'
  }
}

function isBlob(input: unknown): input is Blob {
  return (
    typeof input === 'object' &&
    input !== null &&
    'type' in input &&
    'size' in input &&
    typeof (input as Blob).size === 'number'
  )
}

function detectInputKind(input: ParserInput): MarkdownParserInputKind {
  if (isBlob(input)) return 'blob'
  if (input instanceof ArrayBuffer) return 'array-buffer'
  return 'array-buffer-view'
}

function resolveMimeType(input: ParserInput): string {
  if (isBlob(input) && input.type) return input.type
  return 'text/markdown'
}

function decodeUtf8(input: Uint8Array): string {
  const decoder = new TextDecoder('utf-8', { fatal: true })
  return decoder.decode(input)
}

function parseMarkdown(markdown: string): Root {
  return fromMarkdown(markdown, {
    extensions: [gfm()],
    mdastExtensions: [gfmFromMarkdown()]
  })
}

function stringifyMarkdown(tree: Root): string {
  return toMarkdown(tree, {
    extensions: [gfmToMarkdown()]
  })
}

function normalizeMarkdown(markdown: string): string {
  return stringifyMarkdown(parseMarkdown(markdown))
}

function getMarkdownTitle(markdown: string): string {
  const titleLine = markdown
    .split(/\r\n|\r|\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0)

  if (!titleLine) return 'Markdown Document'
  return (
    titleLine.replace(/^#{1,6}\s+/, '').slice(0, 120) || 'Markdown Document'
  )
}

function makeMarkdownText(markdown: string): IntermediateText {
  const lines = markdown.split(/\r\n|\r|\n/)
  const lineCount = lines.length
  const longestLineLength = lines.reduce(
    (max, line) => Math.max(max, line.length),
    0
  )
  const width = Math.max(1, longestLineLength)
  const height = Math.max(1, lineCount)

  return new IntermediateText({
    id: 'markdown-parser-text-1',
    content: markdown,
    fontSize: 1,
    fontFamily: 'monospace',
    fontWeight: 400,
    italic: false,
    color: '#000000',
    polygon: [
      [0, 0],
      [width, 0],
      [width, height],
      [0, height]
    ],
    lineHeight: 1,
    ascent: 0.8,
    descent: 0.2,
    dir: TextDir.LTR,
    skew: 0,
    isEOL: true
  })
}

function getTextPageSize(text: IntermediateText): {
  width: number
  height: number
} {
  return {
    width: Math.max(1, text.polygon[1][0] - text.polygon[0][0]),
    height: Math.max(1, text.polygon[2][1] - text.polygon[1][1])
  }
}

export class MarkdownParser extends DocumentParser {
  static readonly exts = ['md', 'markdown'] as const
  static readonly ext = 'md' as const

  static async inspect(input: ParserInput): Promise<MarkdownParserInspection> {
    const byteLength = isBlob(input) ? input.size : input.byteLength

    return {
      byteLength,
      kind: detectInputKind(input),
      message:
        'MarkdownParser 使用 mdast/remark 生态解析与回写 UTF-8 Markdown。',
      mimeType: resolveMimeType(input),
      status: 'markdown-supported',
      supportedExtensions: ['md', 'markdown']
    }
  }

  static async encode(input: ParserInput): Promise<IntermediateDocument> {
    try {
      const uint8Array = await DocumentParser.toUint8Array(input)
      const source = decodeUtf8(uint8Array)
      const markdown = normalizeMarkdown(source)
      const text = makeMarkdownText(markdown)
      const { width, height } = getTextPageSize(text)

      const paragraph = new IntermediateParagraph({
        id: 'markdown-parser-paragraph-1',
        x: 0,
        y: 0,
        width,
        height,
        textIds: [text.id]
      })

      const pagesMap = IntermediatePageMap.makeByInfoList([
        {
          id: 'markdown-parser-page-1',
          pageNumber: 1,
          size: { x: width, y: height },
          getData: async () =>
            new IntermediatePage({
              id: 'markdown-parser-page-1',
              number: 1,
              width,
              height,
              content: [text],
              paragraphs: [paragraph],
              thumbnail: undefined
            })
        }
      ])

      return new IntermediateDocument({
        id: 'markdown-parser-document',
        title: getMarkdownTitle(markdown),
        outline: undefined,
        pagesMap
      })
    } catch (error) {
      throw new MarkdownParserError(
        'MarkdownParser 编码失败：输入不是有效的 UTF-8 Markdown 数据',
        {
          cause: error
        }
      )
    }
  }

  static async decode(
    intermediateDocument: IntermediateDocument
  ): Promise<ArrayBuffer> {
    try {
      const pages = await intermediateDocument.pages
      if (pages.length === 0) {
        throw new MarkdownParserError(
          'MarkdownParser 解码失败：中间文档不包含可解码页面'
        )
      }

      const pageMarkdown: string[] = []
      for (const page of pages) {
        const content = await page.getContent()
        const markdown = content
          .filter(isIntermediateTextLike)
          .map((text) => text.content)
          .join('')
        pageMarkdown.push(markdown)
      }

      const markdown = normalizeMarkdown(pageMarkdown.join('\n\n'))
      return new TextEncoder().encode(markdown).buffer
    } catch (error) {
      if (error instanceof MarkdownParserError) {
        throw error
      }
      const message = error instanceof Error ? error.message : String(error)
      throw new MarkdownParserError(`MarkdownParser 解码失败：${message}`)
    }
  }

  static async decodeToMarkdown(
    intermediateDocument: IntermediateDocument
  ): Promise<string> {
    const buffer = await MarkdownParser.decode(intermediateDocument)
    return new TextDecoder('utf-8').decode(buffer)
  }

  static async encodeToMarkdownDocument(
    input: ParserInput
  ): Promise<MarkdownDocument> {
    return new MarkdownDocument(await MarkdownParser.encode(input))
  }

  async encode(input: ParserInput): Promise<IntermediateDocument> {
    return MarkdownParser.encode(input)
  }

  async decode(
    intermediateDocument: IntermediateDocument
  ): Promise<ArrayBuffer> {
    return MarkdownParser.decode(intermediateDocument)
  }
}

export async function inspectMarkdown(
  input: ParserInput
): Promise<MarkdownParserInspection> {
  return MarkdownParser.inspect(input)
}

export {
  type IntermediateDocument,
  IntermediatePage,
  IntermediateText
} from '@hamster-note/types'
export { MarkdownDocument } from './MarkdownDocument.js'
export { MarkdownPage } from './MarkdownPage.js'
export { isIntermediateTextLike }
