import type { FileNode } from '../types'

export const initialFiles: FileNode[] = [
  { name: 'journals', is_dir: true, last_modified: Date.now() - 1000 * 60 * 60 * 4 },
  { name: 'archive', is_dir: true, last_modified: Date.now() - 1000 * 60 * 60 * 24 },
  { name: 'Welcome.md', is_dir: false, last_modified: Date.now() - 1000 * 60 * 30 },
  {
    name: 'Architecture Overview.md',
    is_dir: false,
    last_modified: Date.now() - 1000 * 60 * 60 * 2
  },
  { name: 'Design Decisions.md', is_dir: false, last_modified: Date.now() - 1000 * 60 * 60 * 6 },
  { name: 'Oxlint Guidelines.md', is_dir: false, last_modified: Date.now() - 1000 * 60 * 60 * 12 },
  {
    name: 'Roadmap & Milestones.md',
    is_dir: false,
    last_modified: Date.now() - 1000 * 60 * 60 * 24
  },
  { name: 'Quick Notes.md', is_dir: false, last_modified: Date.now() - 1000 * 60 * 60 * 36 },
  { name: 'Ideas & Sketches.md', is_dir: false, last_modified: Date.now() - 1000 * 60 * 60 * 48 }
]
