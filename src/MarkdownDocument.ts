import type { IntermediateDocument, IntermediateOutline } from '@hamster-note/types'
import { MarkdownPage } from './MarkdownPage.js'

export class MarkdownDocument {
  constructor(private intermediateDocument: IntermediateDocument) {}

  async getPages(): Promise<MarkdownPage[]> {
    const pages = await this.intermediateDocument.pages
    return pages.map((page) => new MarkdownPage(page))
  }

  async getPage(pageNumber: number): Promise<MarkdownPage | undefined> {
    const pagePromise = this.intermediateDocument.getPageByPageNumber(pageNumber)
    if (!pagePromise) return undefined

    const page = await pagePromise
    return page ? new MarkdownPage(page) : undefined
  }

  async getOutline(): Promise<IntermediateOutline | undefined> {
    const outline = this.intermediateDocument.getOutline()
    if (!outline || outline.length === 0) return undefined
    return outline[0]
  }

  getTitle(): string {
    return this.intermediateDocument.title
  }

  getId(): string {
    return this.intermediateDocument.id
  }

  getIntermediateDocument(): IntermediateDocument {
    return this.intermediateDocument
  }
}
