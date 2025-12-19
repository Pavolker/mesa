
export interface LibraryMatch {
    source: 'Catálogo' | 'Kindle Notes';
    content: string;
}

export const libraryService = {
    async search(query: string): Promise<LibraryMatch[]> {
        if (!query.trim()) return [];

        const results: LibraryMatch[] = [];
        const normalizedQuery = query.toLowerCase();

        try {
            const [catalogoRes, kindleRes] = await Promise.all([
                fetch('/livros-catalogo.md'),
                fetch('/NOTAS KINDLE.md')
            ]);

            if (catalogoRes.ok) {
                const text = await catalogoRes.text();
                const matches = this.findMatches(text, normalizedQuery, 'Catálogo');
                results.push(...matches);
            }

            if (kindleRes.ok) {
                const text = await kindleRes.text();
                const matches = this.findMatches(text, normalizedQuery, 'Kindle Notes');
                results.push(...matches);
            }

        } catch (error) {
            console.error("Error searching library:", error);
        }

        return results;
    },

    findMatches(text: string, query: string, source: 'Catálogo' | 'Kindle Notes'): LibraryMatch[] {
        const matches: LibraryMatch[] = [];
        // Split by double newline to approximate paragraphs in markdown, or just lines if preferred.
        // Let's try paragraphs first as it gives more context.
        const paragraphs = text.split(/\n\s*\n/);

        for (const p of paragraphs) {
            if (p.toLowerCase().includes(query)) {
                // Clean up markdown syntax slightly for display if needed, but keeping it raw is fine for now
                matches.push({
                    source,
                    content: p.trim()
                });

                // Limit matches per source to avoid overwhelming UI?
                if (matches.length >= 10) break;
            }
        }

        return matches;
    }
};
