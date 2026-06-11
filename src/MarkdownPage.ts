import type { IntermediatePage, Number2 } from '@hamster-note/types'
import { isIntermediateTextLike } from './intermediateTextGuard.js'

export class MarkdownPage {
  constructor(private readonly intermediatePage: IntermediatePage) {}

  getNumber(): number {
    return this.intermediatePage.number
  }

  getSize(scale: number): Number2 {
    return {
      x: this.intermediatePage.width * scale,
      y: this.intermediatePage.height * scale,
    }
  }

  async getPureText(): Promise<string> {
    const content = await this.intermediatePage.getContent()
    return content
      .filter(isIntermediateTextLike)
      .map((text) => text.content)
      .join('')
  }
}
