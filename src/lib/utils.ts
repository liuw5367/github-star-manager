export function formatStars(count: number): string {
  if (count >= 1000)
    return `${(count / 1000).toFixed(1).replace(/\.0$/, '')}k`
  return String(count)
}

export function getLanguageColor(lang: string | null): string {
  const colors: Record<string, string> = {
    'JavaScript': '#f1e05a',
    'TypeScript': '#3178c6',
    'Python': '#3572A5',
    'Rust': '#dea584',
    'Go': '#00ADD8',
    'Java': '#b07219',
    'Ruby': '#701516',
    'PHP': '#4F5D95',
    'C': '#555555',
    'C++': '#f34b7d',
    'C#': '#178600',
    'Swift': '#F05138',
    'Kotlin': '#A97BFF',
    'Dart': '#00B4AB',
    'Shell': '#89e051',
  }
  return colors[lang || ''] || '#656d76'
}
