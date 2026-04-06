
export function removeImagesFromMarkdown(text: string): string {
    const regex = /!\[([^\]]*)\]\([^)]*\)/g;
    return text.replace(regex, (match, altText: string) => `![${altText}]()`);
}

export function removeLinksFromMarkdown(text: string): string {
    const regex = /\[([^\]]*)\]\([^)]*\)/g;
    return text.replace(regex, (match, linkText: string) => `[${linkText}]()`);
}
