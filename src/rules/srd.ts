/**
 * Typed access to the vendored SRD dataset.
 * Vendored, not fetched: works offline, is instant, and is pinned so the
 * rules cannot change under a saved character.
 * Data (c) Wizards of the Coast, CC-BY-4.0, via 5e-bits/5e-database.
 */
import classesRaw from "./data/Classes.json";
import racesRaw from "./data/Races.json";
import spellsRaw from "./data/Spells.json";
import skillsRaw from "./data/Skills.json";
import levelsRaw from "./data/Levels.json";
import backgroundsRaw from "./data/Backgrounds.json";
import subclassesRaw from "./data/Subclasses.json";
import alignmentsRaw from "./data/Alignments.json";
import languagesRaw from "./data/Languages.json";
import type { Ability } from "../model/character";

export interface Ref { index: string; name: string; url?: string }

export interface SrdClass {
  index: string; name: string; hit_die: number;
  saving_throws: Ref[];
  proficiency_choices?: ProficiencyChoice[];
  proficiencies: Ref[];
  subclasses: Ref[];
  spellcasting?: { level: number; spellcasting_ability: Ref };
}

export interface ProficiencyChoice {
  desc?: string;
  choose: number;
  type: string;
  from: { option_set_type: string; options: { option_type: string; item: Ref }[] };
}

export interface SrdRace {
  index: string; name: string; speed: number;
  ability_bonuses: { ability_score: Ref; bonus: number }[];
  ability_bonus_options?: { choose: number; from: { options: { ability_score: Ref; bonus: number }[] } };
  starting_proficiencies: Ref[];
  starting_proficiency_options?: ProficiencyChoice;
  languages: Ref[];
  size: string;
  traits: Ref[];
}

export interface SrdSpell {
  index: string; name: string; level: number;
  school: Ref; classes: Ref[]; subclasses: Ref[];
  ritual: boolean; concentration: boolean;
  casting_time: string; range: string; duration: string;
  components: string[]; material?: string;
  desc: string[]; higher_level?: string[];
}

export interface SrdSkill { index: string; name: string; ability_score: Ref }

export interface SrdLevel {
  level: number; prof_bonus: number; class: Ref;
  spellcasting?: Record<string, number>;
  features: Ref[];
}

export interface SrdBackground {
  index: string; name: string;
  starting_proficiencies: Ref[];
  language_options?: { choose: number };
}

export const CLASSES = classesRaw as unknown as SrdClass[];
export const RACES = racesRaw as unknown as SrdRace[];
export const SPELLS = spellsRaw as unknown as SrdSpell[];
export const SKILLS = skillsRaw as unknown as SrdSkill[];
export const LEVELS = levelsRaw as unknown as SrdLevel[];
export const BACKGROUNDS = backgroundsRaw as unknown as SrdBackground[];
export const SUBCLASSES = subclassesRaw as unknown as (Ref & { class: Ref })[];
export const ALIGNMENTS = alignmentsRaw as unknown as Ref[];
export const LANGUAGES = languagesRaw as unknown as Ref[];

const by = <T extends { index: string }>(xs: T[]) =>
  new Map(xs.map((x) => [x.index, x]));

export const classByIndex = by(CLASSES);
export const raceByIndex = by(RACES);
export const spellByIndex = by(SPELLS);
export const skillByIndex = by(SKILLS);
export const backgroundByIndex = by(BACKGROUNDS);

/** The SRD writes skill proficiencies as "skill-arcana"; the sheet wants "arcana". */
export function profRefToSkillIndex(index: string): string | null {
  return index.startsWith("skill-") ? index.slice("skill-".length) : null;
}

export function classLevelRow(classIndex: string, level: number): SrdLevel | undefined {
  return LEVELS.find((l) => l.class?.index === classIndex && l.level === level);
}

export function subclassesForClass(classIndex: string): Ref[] {
  return SUBCLASSES.filter((s) => s.class?.index === classIndex);
}

export function spellsForClass(classIndex: string, maxLevel: number): SrdSpell[] {
  return SPELLS.filter(
    (s) => s.level <= maxLevel && s.classes.some((c) => c.index === classIndex),
  ).sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
}

export function abilityOf(skillIndex: string): Ability | null {
  const s = skillByIndex.get(skillIndex);
  if (!s) return null;
  return s.ability_score.index as Ability;
}
