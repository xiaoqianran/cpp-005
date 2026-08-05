/** cpp-004 课程类型 */

export type LessonAction = {
  label: string;
  sceneId?: 0 | 1 | 2 | 3 | 4;
  debugMode?: 0 | 1 | 2 | 3 | 4 | 5;
  useNee?: boolean;
  useMis?: boolean;
  useBvh?: boolean;
  useRr?: boolean;
  maxDepth?: number;
};

export type LessonBlock =
  | { type: "p"; text: string }
  | { type: "h"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "formula"; title?: string; latex: string }
  | { type: "code"; title?: string; lang?: string; code: string }
  | { type: "mermaid"; title?: string; code: string }
  | { type: "callout"; tone: "info" | "warn" | "tip"; text: string }
  | { type: "map"; rows: { file: string; note: string }[] }
  | { type: "compare"; left: { title: string; body: string }; right: { title: string; body: string } }
  | { type: "quiz"; q: string; options: string[]; answer: number; explain: string };

export type Lesson = {
  id: string;
  title: string;
  minutes: number;
  summary: string;
  refs: string[];
  blocks: LessonBlock[];
  action?: LessonAction;
};

export type Chapter = {
  id: string;
  index: number;
  title: string;
  subtitle: string;
  lessons: Lesson[];
};
