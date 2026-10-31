/**
 * src/lib/kimsLeikUtils.ts
 * Hjelpefunksjonar, emoji-handtering og preset-lister for Kims Leik
 */

export interface KimsLeikItem {
  id: string;
  name: string;
  emoji: string;
  text?: string;
  iconName?: string;
  imageUrl?: string;
}

export type KimsTheme = 'kvardag' | 'kyrkje' | 'skule';

/**
 * Hentar visuelt uttrykk for ein Kims Leik gjenstand.
 * KI (Gemini) leverer name og emoji direkte. Fjerner all hardkoda ordbok-matching.
 */
export function getItemGraphic(itemInput: KimsLeikItem | string): { emoji: string; bgClass: string; label: string; isEmpty: boolean } {
  if (typeof itemInput === 'string') {
    const trimmed = itemInput.trim();
    return {
      emoji: trimmed ? '📦' : '➕',
      bgClass: trimmed ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-slate-100 text-slate-300 border-slate-200',
      label: trimmed,
      isEmpty: !trimmed,
    };
  }

  const label = (itemInput.name || itemInput.text || '').trim();
  const rawEmoji = (itemInput.emoji || itemInput.iconName || '').trim();
  const isEmpty = !label && !rawEmoji;
  const emoji = rawEmoji || (label ? '📦' : '➕');

  return {
    emoji,
    bgClass: isEmpty
      ? 'bg-slate-100/80 text-slate-300 border-slate-200/80'
      : 'bg-amber-100 text-amber-900 border-amber-300',
    label,
    isEmpty,
  };
}

// Preset-lister for 12, 16 og 20 gjenstandar med eksplisitt name og emoji
export const PRESET_KIMS_ITEMS: Record<KimsTheme, Array<{ name: string; emoji: string }>> = {
  kvardag: [
    { name: 'Nøklar', emoji: '🔑' },
    { name: 'Kaffekopp', emoji: '☕' },
    { name: 'Briller', emoji: '👓' },
    { name: 'Blyant', emoji: '✏️' },
    { name: 'Mobil', emoji: '📱' },
    { name: 'Klokke', emoji: '⏰' },
    { name: 'Saks', emoji: '✂️' },
    { name: 'Lue', emoji: '🧢' },
    { name: 'Sokk', emoji: '🧦' },
    { name: 'Eple', emoji: '🍎' },
    { name: 'Sko', emoji: '👟' },
    { name: 'Fotball', emoji: '⚽' },
    { name: 'Vannflaske', emoji: '🍼' },
    { name: 'Paraply', emoji: '☂️' },
    { name: 'Høretelefonar', emoji: '🎧' },
    { name: 'Sykkel', emoji: '🚲' },
    { name: 'Matpakke', emoji: '🍱' },
    { name: 'Lommebok', emoji: '👛' },
    { name: 'Solbriller', emoji: '🕶️' },
    { name: 'Bok', emoji: '📖' },
  ],
  kyrkje: [
    { name: 'Kross', emoji: '✝️' },
    { name: 'Palmegrein', emoji: '🌿' },
    { name: 'Bibel', emoji: '📖' },
    { name: 'Stearinlys', emoji: '🕯️' },
    { name: 'Kalk', emoji: '🍷' },
    { name: 'Brød', emoji: '🍞' },
    { name: 'Fisk', emoji: '🐟' },
    { name: 'Hjerte', emoji: '❤️' },
    { name: 'Krone', emoji: '👑' },
    { name: 'Stjerne', emoji: '⭐' },
    { name: 'Døpefont', emoji: '💧' },
    { name: 'Salmebok', emoji: '📕' },
    { name: 'Due', emoji: '🕊️' },
    { name: 'Gullmynt', emoji: '🪙' },
    { name: 'Kirkenøkkel', emoji: '🔑' },
    { name: 'Orgel', emoji: '🎹' },
    { name: 'Kjærleik', emoji: '💖' },
    { name: 'Takkebøn', emoji: '🙏' },
    { name: 'Dåpslys', emoji: '🕯️' },
    { name: 'Tre', emoji: '🌳' },
  ],
  skule: [
    { name: 'Sekk', emoji: '🎒' },
    { name: 'Linjal', emoji: '📐' },
    { name: 'Saks', emoji: '✂️' },
    { name: 'Blyant', emoji: '✏️' },
    { name: 'Viskelær', emoji: '🧹' },
    { name: 'Matpakke', emoji: '🍱' },
    { name: 'Drikkeflaske', emoji: '🍼' },
    { name: 'Fotball', emoji: '⚽' },
    { name: 'Gitar', emoji: '🎸' },
    { name: 'Solbriller', emoji: '🕶️' },
    { name: 'Mobil', emoji: '📱' },
    { name: 'Kaffekopp', emoji: '☕' },
    { name: 'Skulebok', emoji: '📘' },
    { name: 'Passer', emoji: '📐' },
    { name: 'Datamaskin', emoji: '💻' },
    { name: 'Nøkkelkort', emoji: '💳' },
    { name: 'Kalkulator', emoji: '🔢' },
    { name: 'Tegneblokk', emoji: '🎨' },
    { name: 'Melkekartong', emoji: '🥛' },
    { name: 'Hoppetau', emoji: '🪢' },
  ],
};

export function getPresetItems(count: 12 | 16 | 20, theme: KimsTheme = 'kvardag'): KimsLeikItem[] {
  const items = PRESET_KIMS_ITEMS[theme] || PRESET_KIMS_ITEMS.kvardag;
  return items.slice(0, count).map((it, idx) => ({
    id: `kims_preset_${Date.now()}_${idx}`,
    name: it.name,
    emoji: it.emoji,
    text: it.name,
    iconName: it.emoji,
  }));
}

export async function generateKimsItemsWithAI(
  promptTopic: string,
  count: 12 | 16 | 20,
  language: 'nn' | 'nb' = 'nn'
): Promise<KimsLeikItem[]> {
  const cleanPrompt = promptTopic.trim();
  if (!cleanPrompt) return getPresetItems(count, 'kvardag');

  try {
    const res = await fetch('/api/kims-leik/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: cleanPrompt, count, language, lang: language }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.items) && data.items.length > 0) {
        return data.items.slice(0, count).map((rawItem: any, idx: number) => {
          if (typeof rawItem === 'object' && rawItem !== null) {
            const name = (rawItem.name || rawItem.text || `Gjenstand ${idx + 1}`).trim();
            const emoji = (rawItem.emoji || rawItem.iconName || '📦').trim();
            return {
              id: `kims_ai_${Date.now()}_${idx}`,
              name,
              emoji,
              text: name,
              iconName: emoji,
            };
          }
          const name = String(rawItem || `Gjenstand ${idx + 1}`).trim();
          return {
            id: `kims_ai_${Date.now()}_${idx}`,
            name,
            emoji: '📦',
            text: name,
            iconName: '📦',
          };
        });
      }
    }
  } catch (err) {
    console.warn('[KimsLeik AI] Server call failed, using fallback:', err);
  }

  const lower = cleanPrompt.toLowerCase();
  const theme: KimsTheme = (lower.includes('kyrkje') || lower.includes('kirke') || lower.includes('påske') || lower.includes('jul') || lower.includes('bibel') || lower.includes('dåp'))
    ? 'kyrkje'
    : (lower.includes('skule') || lower.includes('skole') || lower.includes('fritid'))
    ? 'skule'
    : 'kvardag';

  return getPresetItems(count, theme);
}
