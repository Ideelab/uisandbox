import { useMemo, useState } from 'react'
import { Bot, Braces, Check, ChevronLeft, Copy, Diff, Download, FileCode2, FileJson2, FileText, Replace, Smartphone, SwatchBook, Wind, Boxes, Apple, FolderTree, X } from 'lucide-react'
import type { Config } from '../tokens/types'
import { DIALS } from '../sandbox/dials'
import type { SubstitutionTable } from '../sandbox/table'
import type { Anchors, PaintRoles } from '../sandbox/coverage'
import { genSheetCss, genSheetJson, genPatch, genPatchedFiles } from '../export/genSheet'
import type { ServedFile } from '../sandbox/project'
import { useEffect } from 'react'
import { genCss } from '../export/genCss'
import { genJson } from '../export/genJson'
import { genTailwind } from '../export/genTailwind'
import { genShadcn } from '../export/genShadcn'
import { genSwift, genAssetCatalog } from '../export/genSwift'
import { genAndroidColorsXml, genAndroidKotlin } from '../export/genAndroid'
import { genDesignMd } from '../export/genDesignMd'
import { genAgentsBlock } from '../export/genAgents'
import { genDtcg } from '../export/genDtcg'
import { measure } from '../export/measured'
import { roleValues } from '../kits/values'
import { isCustomFont, SYSTEM_FONT, SERIF_FONTS, MONO_FONTS } from '../tokens/fonts'
import { MAP } from '../kits/engine/roles.mjs'
import type { RoleValues } from '../kits/engine/generate.mjs'
import { kitExport, kitPackage } from '../kits/kitExport'
import { knobLabel } from '../state/carry'
import { SendButton, ShareButton } from './EditorBar'
import { LAYOUT_DONTS, type Tell } from '../sandbox/tells'
import { pinToBuild, lightDeclarations } from '../kits/pin'
import type { KitId } from '../kits/engine/detect.mjs'
import { genReadme } from '../export/genReadme'
import { zipSync } from '../export/zip'

interface ExportDialogProps {
  /** Opened by the local server: Send hands it back to the agent or terminal (decision 216). */
  send?: { to: 'agent' | 'terminal'; onSend: () => Promise<{ waiting: number } | null> }
  /** The tells measured on the screen: the ones no knob reaches go into the prompt as don'ts. */
  tells?: Tell[]
  /** The stand of their code — the overview names what was turned, from → to. */
  base: Config
  cfg: Config
  table: SubstitutionTable
  vars: Record<string, string>
  projectName: string
  /** A build made from a kit through the kit door (its display name), not
   *  somebody's code: the copy says "the kit", not "your code". */
  kitDoorName?: string
  /** A link that reopens this build with these knobs, or null when it has no address (Share). */
  shareUrl?: string | null
  /** Their original files — the patched export writes the values into these. */
  files: Map<string, ServedFile>
  fontCss: string
  /** Where the readings came from; DESIGN.md carries them as provenance. */
  notes?: string[]
  /** Where the coverage walk saw each sheet entry, plus the page's own ink and
   *  ground. What the exports that DESCRIBE the design read their roles from —
   *  a stylesheet census alone calls Bootstrap's body ink a background. */
  painted?: Map<number, PaintRoles>
  anchors?: Anchors
  /** Which of the nine kits the build runs on. THREE answers, not two:
   *  `undefined` means the screen has not been read yet, `null` means it runs
   *  on none of them (or on a major version the kit data does not describe,
   *  Bootstrap 4 against 5.3.8), and a kit id means the agent files come from
   *  the kit engine in that kit's own names, with a SKILL.md. Treating
   *  "not read yet" as "none" told a user that AdminLTE runs on no kit at all,
   *  because on a busy page the reading takes ten seconds to arrive. */
  kit?: KitId | null
  /** With a kit: each role read off that kit's own variable on the page.
   *  These win over anything measured, which only fills the roles the kit has
   *  no variable for. */
  kitValues?: RoleValues
  /** Reads the live page for the given variables, so theme.css can be pinned
   *  to what the build already has (src/kits/pin.ts). */
  readPageVars?: (names: string[]) => Record<string, string>
  onClose: () => void
}


/** The marks a destination lands in, as the OWNERS draw them.
 *
 *  These used to be hand-approximations: a four-pointed sparkle standing in
 *  for Claude, a generic cube for Cursor. A gesture at a logo, presented where
 *  a logo goes, is a small untruth of the same family as the copy ones — so
 *  the path data is transcribed from simple-icons (the icon data is CC0; the
 *  marks themselves stay their owners' trademarks, used here only to say what
 *  this export lands in, monochrome and unmodified).
 *
 *  Transcribed: CSS3, HTML5, Tailwind CSS, shadcn/ui, Claude, OpenAI, Cursor,
 *  Figma, Swift, Android. No <title> on any of them: the svg is aria-hidden
 *  and the visible label beside it already says the name, so a title could
 *  never be announced and only turned the text into "ClaudeClaude Code".
 *
 *  Two deliberate absences. The APPLE logo is not here even though the export
 *  targets Apple platforms: Apple's guidelines do not allow its logo to
 *  indicate compatibility, and the Swift mark is both permitted and more
 *  accurate about what actually comes out. LOVABLE has no published mark in
 *  the set, so it stays a word rather than a drawing of ours.
 */
const M = {
  css: <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M1.5 0h21l-1.91 21.563L11.977 24l-8.565-2.438L1.5 0zm17.09 4.413L5.41 4.41l.213 2.622 10.125.002-.255 2.716h-6.64l.24 2.573h6.182l-.366 3.523-2.91.804-2.956-.81-.188-2.11h-2.61l.29 3.855L12 19.288l5.373-1.53L18.59 4.414z" /></svg>,
  html: <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M1.5 0h21l-1.91 21.563L11.977 24l-8.564-2.438L1.5 0zm7.031 9.75l-.232-2.718 10.059.003.23-2.622L5.412 4.41l.698 8.01h9.126l-.326 3.426-2.91.804-2.955-.81-.188-2.11H6.248l.33 4.171L12 19.351l5.379-1.443.744-8.157H8.531z" /></svg>,
  tailwind: <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M12.001,4.8c-3.2,0-5.2,1.6-6,4.8c1.2-1.6,2.6-2.2,4.2-1.8c0.913,0.228,1.565,0.89,2.288,1.624 C13.666,10.618,15.027,12,18.001,12c3.2,0,5.2-1.6,6-4.8c-1.2,1.6-2.6,2.2-4.2,1.8c-0.913-0.228-1.565-0.89-2.288-1.624 C16.337,6.182,14.976,4.8,12.001,4.8z M6.001,12c-3.2,0-5.2,1.6-6,4.8c1.2-1.6,2.6-2.2,4.2-1.8c0.913,0.228,1.565,0.89,2.288,1.624 c1.177,1.194,2.538,2.576,5.512,2.576c3.2,0,5.2-1.6,6-4.8c-1.2,1.6-2.6,2.2-4.2,1.8c-0.913-0.228-1.565-0.89-2.288-1.624 C10.337,13.382,8.976,12,6.001,12z" /></svg>,
  shadcn: <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M22.219 11.784 11.784 22.219c-.407.407-.407 1.068 0 1.476.407.407 1.068.407 1.476 0L23.695 13.26c.407-.408.407-1.069 0-1.476-.408-.407-1.069-.407-1.476 0ZM20.132.305.305 20.132c-.407.407-.407 1.068 0 1.476.408.407 1.069.407 1.476 0L21.608 1.781c.407-.407.407-1.068 0-1.476-.408-.407-1.069-.407-1.476 0Z" /></svg>,
  claude: <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="m4.7144 15.9555 4.7174-2.6471.079-.2307-.079-.1275h-.2307l-.7893-.0486-2.6956-.0729-2.3375-.0971-2.2646-.1214-.5707-.1215-.5343-.7042.0546-.3522.4797-.3218.686.0608 1.5179.1032 2.2767.1578 1.6514.0972 2.4468.255h.3886l.0546-.1579-.1336-.0971-.1032-.0972L6.973 9.8356l-2.55-1.6879-1.3356-.9714-.7225-.4918-.3643-.4614-.1578-1.0078.6557-.7225.8803.0607.2246.0607.8925.686 1.9064 1.4754 2.4893 1.8336.3643.3035.1457-.1032.0182-.0728-.164-.2733-1.3539-2.4467-1.445-2.4893-.6435-1.032-.17-.6194c-.0607-.255-.1032-.4674-.1032-.7285L6.287.1335 6.6997 0l.9957.1336.419.3642.6192 1.4147 1.0018 2.2282 1.5543 3.0296.4553.8985.2429.8318.091.255h.1579v-.1457l.1275-1.706.2368-2.0947.2307-2.6957.0789-.7589.3764-.9107.7468-.4918.5828.2793.4797.686-.0668.4433-.2853 1.8517-.5586 2.9021-.3643 1.9429h.2125l.2429-.2429.9835-1.3053 1.6514-2.0643.7286-.8196.85-.9046.5464-.4311h1.0321l.759 1.1293-.34 1.1657-1.0625 1.3478-.8804 1.1414-1.2628 1.7-.7893 1.36.0729.1093.1882-.0183 2.8535-.607 1.5421-.2794 1.8396-.3157.8318.3886.091.3946-.3278.8075-1.967.4857-2.3072.4614-3.4364.8136-.0425.0304.0486.0607 1.5482.1457.6618.0364h1.621l3.0175.2247.7892.522.4736.6376-.079.4857-1.2142.6193-1.6393-.3886-3.825-.9107-1.3113-.3279h-.1822v.1093l1.0929 1.0686 2.0035 1.8092 2.5075 2.3314.1275.5768-.3218.4554-.34-.0486-2.2039-1.6575-.85-.7468-1.9246-1.621h-.1275v.17l.4432.6496 2.3436 3.5214.1214 1.0807-.17.3521-.6071.2125-.6679-.1214-1.3721-1.9246L14.38 17.959l-1.1414-1.9428-.1397.079-.674 7.2552-.3156.3703-.7286.2793-.6071-.4614-.3218-.7468.3218-1.4753.3886-1.9246.3157-1.53.2853-1.9004.17-.6314-.0121-.0425-.1397.0182-1.4328 1.9672-2.1796 2.9446-1.7243 1.8456-.4128.164-.7164-.3704.0667-.6618.4008-.5889 2.386-3.0357 1.4389-1.882.929-1.0868-.0062-.1579h-.0546l-6.3385 4.1164-1.1293.1457-.4857-.4554.0608-.7467.2307-.2429 1.9064-1.3114Z" /></svg>,
  openai: <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z" /></svg>,
  cursor: <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M11.503.131 1.891 5.678a.84.84 0 0 0-.42.726v11.188c0 .3.162.575.42.724l9.609 5.55a1 1 0 0 0 .998 0l9.61-5.55a.84.84 0 0 0 .42-.724V6.404a.84.84 0 0 0-.42-.726L12.497.131a1.01 1.01 0 0 0-.996 0M2.657 6.338h18.55c.263 0 .43.287.297.515L12.23 22.918c-.062.107-.229.064-.229-.06V12.335a.59.59 0 0 0-.295-.51l-9.11-5.257c-.109-.063-.064-.23.061-.23" /></svg>,
  figma: <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M15.852 8.981h-4.588V0h4.588c2.476 0 4.49 2.014 4.49 4.49s-2.014 4.491-4.49 4.491zM12.735 7.51h3.117c1.665 0 3.019-1.355 3.019-3.019s-1.355-3.019-3.019-3.019h-3.117V7.51zm0 1.471H8.148c-2.476 0-4.49-2.014-4.49-4.49S5.672 0 8.148 0h4.588v8.981zm-4.587-7.51c-1.665 0-3.019 1.355-3.019 3.019s1.354 3.02 3.019 3.02h3.117V1.471H8.148zm4.587 15.019H8.148c-2.476 0-4.49-2.014-4.49-4.49s2.014-4.49 4.49-4.49h4.588v8.98zM8.148 8.981c-1.665 0-3.019 1.355-3.019 3.019s1.355 3.019 3.019 3.019h3.117V8.981H8.148zM8.172 24c-2.489 0-4.515-2.014-4.515-4.49s2.014-4.49 4.49-4.49h4.588v4.441c0 2.503-2.047 4.539-4.563 4.539zm-.024-7.51a3.023 3.023 0 0 0-3.019 3.019c0 1.665 1.365 3.019 3.044 3.019 1.705 0 3.093-1.376 3.093-3.068v-2.97H8.148zm7.704 0h-.098c-2.476 0-4.49-2.014-4.49-4.49s2.014-4.49 4.49-4.49h.098c2.476 0 4.49 2.014 4.49 4.49s-2.014 4.49-4.49 4.49zm-.097-7.509c-1.665 0-3.019 1.355-3.019 3.019s1.355 3.019 3.019 3.019h.098c1.665 0 3.019-1.355 3.019-3.019s-1.355-3.019-3.019-3.019h-.098z" /></svg>,
  swift: <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M7.508 0c-.287 0-.573 0-.86.002-.241.002-.483.003-.724.01-.132.003-.263.009-.395.015A9.154 9.154 0 0 0 4.348.15 5.492 5.492 0 0 0 2.85.645 5.04 5.04 0 0 0 .645 2.848c-.245.48-.4.972-.495 1.5-.093.52-.122 1.05-.136 1.576a35.2 35.2 0 0 0-.012.724C0 6.935 0 7.221 0 7.508v8.984c0 .287 0 .575.002.862.002.24.005.481.012.722.014.526.043 1.057.136 1.576.095.528.25 1.02.495 1.5a5.03 5.03 0 0 0 2.205 2.203c.48.244.97.4 1.498.495.52.093 1.05.124 1.576.138.241.007.483.009.724.01.287.002.573.002.86.002h8.984c.287 0 .573 0 .86-.002.241-.001.483-.003.724-.01a10.523 10.523 0 0 0 1.578-.138 5.322 5.322 0 0 0 1.498-.495 5.035 5.035 0 0 0 2.203-2.203c.245-.48.4-.972.495-1.5.093-.52.124-1.05.138-1.576.007-.241.009-.481.01-.722.002-.287.002-.575.002-.862V7.508c0-.287 0-.573-.002-.86a33.662 33.662 0 0 0-.01-.724 10.5 10.5 0 0 0-.138-1.576 5.328 5.328 0 0 0-.495-1.5A5.039 5.039 0 0 0 21.152.645 5.32 5.32 0 0 0 19.654.15a10.493 10.493 0 0 0-1.578-.138 34.98 34.98 0 0 0-.722-.01C17.067 0 16.779 0 16.492 0H7.508zm6.035 3.41c4.114 2.47 6.545 7.162 5.549 11.131-.024.093-.05.181-.076.272l.002.001c2.062 2.538 1.5 5.258 1.236 4.745-1.072-2.086-3.066-1.568-4.088-1.043a6.803 6.803 0 0 1-.281.158l-.02.012-.002.002c-2.115 1.123-4.957 1.205-7.812-.022a12.568 12.568 0 0 1-5.64-4.838c.649.48 1.35.902 2.097 1.252 3.019 1.414 6.051 1.311 8.197-.002C9.651 12.73 7.101 9.67 5.146 7.191a10.628 10.628 0 0 1-1.005-1.384c2.34 2.142 6.038 4.83 7.365 5.576C8.69 8.408 6.208 4.743 6.324 4.86c4.436 4.47 8.528 6.996 8.528 6.996.154.085.27.154.36.213.085-.215.16-.437.224-.668.708-2.588-.09-5.548-1.893-7.992z" /></svg>,
  android: <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M18.4395 5.5586c-.675 1.1664-1.352 2.3318-2.0274 3.498-.0366-.0155-.0742-.0286-.1113-.043-1.8249-.6957-3.484-.8-4.42-.787-1.8551.0185-3.3544.4643-4.2597.8203-.084-.1494-1.7526-3.021-2.0215-3.4864a1.1451 1.1451 0 0 0-.1406-.1914c-.3312-.364-.9054-.4859-1.379-.203-.475.282-.7136.9361-.3886 1.5019 1.9466 3.3696-.0966-.2158 1.9473 3.3593.0172.031-.4946.2642-1.3926 1.0177C2.8987 12.176.452 14.772 0 18.9902h24c-.119-1.1108-.3686-2.099-.7461-3.0683-.7438-1.9118-1.8435-3.2928-2.7402-4.1836a12.1048 12.1048 0 0 0-2.1309-1.6875c.6594-1.122 1.312-2.2559 1.9649-3.3848.2077-.3615.1886-.7956-.0079-1.1191a1.1001 1.1001 0 0 0-.8515-.5332c-.5225-.0536-.9392.3128-1.0488.5449zm-.0391 8.461c.3944.5926.324 1.3306-.1563 1.6503-.4799.3197-1.188.0985-1.582-.4941-.3944-.5927-.324-1.3307.1563-1.6504.4727-.315 1.1812-.1086 1.582.4941zM7.207 13.5273c.4803.3197.5506 1.0577.1563 1.6504-.394.5926-1.1038.8138-1.584.4941-.48-.3197-.5503-1.0577-.1563-1.6504.4008-.6021 1.1087-.8106 1.584-.4941z" /></svg>,
  /** Lovable is not in simple-icons, but it is not a redraw either: this is the
   *  outline their own favicon carries (lovable.dev/favicon.svg), unscaled, on
   *  its native 180 viewBox. The gradient inside it is decoration; the
   *  silhouette is the logomark, and their brand hub publishes Black and White
   *  variants of exactly that. It is not a heart, whatever the name suggests. */
  lovable: <svg viewBox="0 0 180 180" fill="currentColor" aria-hidden><path fillRule="evenodd" clipRule="evenodd" d="M54.6052 0C83.9389 0 107.719 23.8424 107.719 53.2535V73.4931H125.395C154.729 73.4931 178.508 97.3355 178.508 126.747C178.508 156.158 154.729 180 125.395 180H1.4917V53.2535C1.4917 23.8424 25.2714 0 54.6052 0Z" /></svg>,
  /** JSON has no owner and no mark: a brace pair is a description, not a logo. */
  json: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M8 3.5A2.5 2.5 0 0 0 5.5 6v3A2.5 2.5 0 0 1 3 11.5 2.5 2.5 0 0 1 5.5 14v4A2.5 2.5 0 0 0 8 20.5M16 3.5A2.5 2.5 0 0 1 18.5 6v3a2.5 2.5 0 0 0 2.5 2.5 2.5 2.5 0 0 0-2.5 2.5v4a2.5 2.5 0 0 1-2.5 2.5" /></svg>,
}

interface Item {
  id: string
  label: string
  sub?: string
  icon?: React.ReactNode
  file: string
  /** Two or three plain sentences: what this is and what to do with it. The
   *  dialog shows them above the code — a pane with a Copy button and no
   *  instructions only works for somebody who already knew. */
  how: string[]
  make: () => string
}

/**
 * Export answers one question — how do you want to apply this? — and the
 * destinations are the honest answers to it, in the order they serve people:
 *
 *   AGENT     DESIGN.md + the AGENTS.md line + W3C tokens. Their agent already
 *             reads these formats; nobody has to understand ours.
 *   SOURCE    their own files, patched. The complete, provable change.
 *   SHEET     every value we found, as a reference. NOT a drop-in stylesheet,
 *             and the copy says so — their CSS does not read our var names.
 *   SYSTEM    tokens seeded from these values. A different thing: a new system,
 *             not their app's own names, and labelled that way.
 *   NATIVE    Swift + Android.
 */
/** The kit files that have a tab of their own; anything else the engine writes gets one too. */
const KIT_COVERED = new Set(['DESIGN.md', 'tokens.json', 'theme.css', 'install.md', 'MANIFEST.md'])

/** The nine, as each calls itself. */
const KIT_NAME: Record<KitId, string> = {
  antd: 'Ant Design', bootstrap: 'Bootstrap', daisyui: 'daisyUI', mantine: 'Mantine', material: 'Material',
  openprops: 'Open Props', radix: 'Radix Themes', shadcn: 'shadcn/ui', tailwind: 'Tailwind',
}

/** A family the Type knob chose, in the form the engine writes a webfont:
 *  `'Figtree', sans-serif`. The page computes it as `Figtree, sans-serif`,
 *  which the engine reads as a system stack, so DESIGN.md never said where
 *  Figtree comes from and an agent told to add no new fonts fell back to
 *  sans-serif (decision 216). An uploaded font has no address to give. */
function chosenFonts(cfg: Config, base: Config): RoleValues {
  const out: RoleValues = {}
  // the generic is the family's own: the page's heading variable can still
  // hold the body stack, and Fraunces went out as `'Fraunces', sans-serif`
  const as = (f: string) => `'${f}', ${SERIF_FONTS.includes(f) ? 'serif' : MONO_FONTS.includes(f) ? 'monospace' : 'sans-serif'}`
  if (isWeb(cfg.fontBody, base.fontBody)) out.fontBody = as(cfg.fontBody)
  if (isWeb(cfg.fontDisplay, base.fontDisplay)) out.fontHeading = as(cfg.fontDisplay)
  return out
}
const isWeb = (f: string, was: string) => f !== was && f !== SYSTEM_FONT && !isCustomFont(f)
/** The same families by name, for the own-app DESIGN.md's font link. */
const webFamilies = (cfg: Config, base: Config) =>
  [...new Set([cfg.fontDisplay, cfg.fontBody].filter((f, i) => isWeb(f, i === 0 ? base.fontDisplay : base.fontBody)))]

export function ExportDialog({ cfg, base, table, vars, projectName, kitDoorName, shareUrl, files, fontCss, notes, painted, anchors, kit, kitValues, readPageVars, onClose, send, tells = [] }: ExportDialogProps) {
  const [patched, setPatched] = useState<Array<{ path: string; text: string }> | null>(null)
  useEffect(() => { let on = true; void genPatchedFiles(files, table, vars, fontCss).then((p) => { if (on) setPatched(p) }); return () => { on = false } }, [files, table, vars, fontCss])
  const movedCount = useMemo(() => { const id = table.identityVars(); return Object.keys(vars).filter((k) => vars[k] !== id[k]).length }, [table, vars])

  // The kit engine's files for a build on one of the nine. Fetched when the
  // dialog opens because only the detected kit's values are loaded, and they
  // are async. Until they arrive the measured files stand in, so nothing is
  // ever blank; with no kit they simply stay.
  const [kitFiles, setKitFiles] = useState<Record<string, string> | null>(null)
  const [kitError, setKitError] = useState<string | null>(null)
  useEffect(() => {
    setKitError(null)
    if (!kit) { setKitFiles(null); return }
    let on = true
    const m = measure(table, vars, cfg.cPrimary, { display: cfg.fontDisplay, body: cfg.fontBody }, { painted, anchors })
    const changed = movedCount === 0 ? 'none of them changed' : `${movedCount} of them changed`
    const overview = kitDoorName
      ? `These values start from ${kitDoorName} as it ships, read off the build UISandbox made of it: ${m.totals.values} design values, ${changed} in this pass. They are written here in the names this kit publishes, so they are the ones to build against.`
      : `These values were read off ${projectName}'s own build in UISandbox, not chosen: ${m.totals.values} design values out of its stylesheets, ${changed} in this pass. They are written here in the names this kit publishes, so they are the ones to build against.`
    // The kit's own variables first; what was measured only fills the roles
    // it has none for. No family centre goes in for status: a centre is the
    // most-used member, which on AdminLTE was a syntax-highlight green, and a
    // kit default named in MANIFEST.md beats a guess.
    // and the two dials DESIGN.md describes as turned: depth said "100% of
    // its published strength" with Elevation at ×0.5 (decision 216)
    const chosen = chosenFonts(cfg, base)
    const values = { ...roleValues(m), ...kitValues, ...chosen, elevation: String(cfg.sb.shadow ?? 1), spaceScale: String(cfg.sb.space ?? 1) }
    void kitExport(kit, values, projectName, { overview }).then((f) => {
      // A build's own variables win; the engine's derivation only fills what
      // the build does not define.
      // A family the knob chose is not pinned back: the knob sets headings by
      // selector, so the page's own --font-heading still says the body face,
      // and pinning put Figtree back where Fraunces was chosen (Tailwind, Radix).
      if (readPageVars && f['theme.css']) {
        const page = readPageVars(lightDeclarations(f['theme.css']))
        const map = (MAP as Record<string, Record<string, { var?: string; also?: string[] } | null>>)[kit] ?? {}
        for (const role of Object.keys(chosen)) for (const n of [map[role]?.var, ...(map[role]?.also ?? [])]) if (n) delete page[n]
        f = { ...f, 'theme.css': pinToBuild(f['theme.css'], page).css }
      }
      if (on) setKitFiles(kitPackage(f))
    }).catch((e: unknown) => { if (on) { setKitFiles(null); setKitError(e instanceof Error ? e.message : String(e)) } })
    return () => { on = false }
  }, [kit, kitValues, readPageVars, table, vars, cfg, base, projectName, kitDoorName, painted, anchors, movedCount])
  const skillPath = kitFiles ? Object.keys(kitFiles).find((k) => k.endsWith('/SKILL.md')) : undefined

  const items = useMemo<Item[]>(() => [
    {
      id: 'design-md', label: 'DESIGN.md', sub: 'your design system, as agents read it', icon: <FileText size={15} strokeWidth={1.75} />, file: 'DESIGN.md',
      how: kitFiles ? [
        'Save this as DESIGN.md in the root of your repo, and SKILL.md where its tab says.',
        `It is written in ${KIT_NAME[kit!]}'s own variable names, because that is what this build runs on.`,
        'Then ask: apply DESIGN.md and SKILL.md, screen by screen.',
      ] : [
        'Save this as DESIGN.md in the root of your repo.',
        'Add the AGENTS.md block (next tab) so your agent picks it up on every task.',
        'Then ask: apply DESIGN.md to the UI.',
      ],
      make: () => kitFiles?.['DESIGN.md'] ?? genDesignMd(table, vars, cfg, projectName, { notes, painted, anchors, webfonts: webFamilies(cfg, base) }),
    },
    {
      id: 'agents-md', label: 'AGENTS.md', sub: 'the one line that points at it', icon: <Bot size={15} strokeWidth={1.75} />, file: 'AGENTS.snippet.md',
      how: [
        'Append this to AGENTS.md in your repo root. No AGENTS.md yet? Make one with this in it.',
        'Claude Code reads CLAUDE.md instead. The same block works there, and in GEMINI.md or .cursorrules.',
        'It is a block to add, not a file to overwrite: your build and test instructions stay where they are.',
      ],
      make: () => genAgentsBlock(projectName, { moved: movedCount }),
    },
    {
      id: 'dtcg', label: 'Design tokens', sub: 'W3C format, for Figma and Style Dictionary', icon: <SwatchBook size={15} strokeWidth={1.75} />, file: 'design.tokens.json',
      how: [
        'Save as design.tokens.json. This is the W3C Design Tokens format (2025.10), not a format of ours.',
        'Import it in Tokens Studio for Figma, or point Style Dictionary at it to build for any platform.',
        'It describes the app we measured. Values we could not express in the format were left out rather than bent to fit.',
      ],
      make: () => kitFiles?.['tokens.json'] ?? genDtcg(table, vars, cfg, projectName, { painted, anchors }),
    },
    // What only the kit engine can write: a SKILL.md citing classes the kit's
    // own stylesheet defines, and the theme in the form that kit takes. A
    // build on none of the nine gets neither, and the agent card says why
    // rather than handing over a skill with nothing real to cite.
    ...(kitFiles && skillPath ? [
      {
        id: 'skill-md', label: 'SKILL.md', sub: 'how to build screens in this system', icon: <Bot size={15} strokeWidth={1.75} />, file: skillPath,
        how: [
          `Save it at ${skillPath}. Claude Code loads it on its own when the work is UI, so nobody has to remember to paste it.`,
          `DESIGN.md says what is true; this says what to do: one primary action per view, how controls group, where motion comes from, in ${KIT_NAME[kit!]}'s own classes.`,
          'Every class it names is one that kit publishes.',
        ],
        make: () => kitFiles[skillPath]!,
      },
      {
        id: 'kit-theme', label: 'theme.css', sub: `${KIT_NAME[kit!]}'s own variables, set`, icon: <Braces size={15} strokeWidth={1.75} />, file: 'theme.css',
        how: ['Import it after the kit, so your values win.', 'Every variable in it belongs to the kit that publishes it; nothing in it is ours.', 'install.md says how, and what has to be rebuilt.'],
        make: () => kitFiles['theme.css']!,
      },
      {
        id: 'kit-install', label: 'install.md', sub: 'what to run, in order', icon: <FileText size={15} strokeWidth={1.75} />, file: 'install.md',
        how: ['The steps to make the kit wear these values, including any it compiles rather than reads at runtime.'],
        make: () => kitFiles['install.md']!,
      },
      {
        id: 'kit-manifest', label: 'MANIFEST.md', sub: 'what could not be set, and why', icon: <FileText size={15} strokeWidth={1.75} />, file: 'MANIFEST.md',
        how: ['What this theme writes that the kit never reads, and what the kit has no component for. Read it before you trust a knob that seems to do nothing.'],
        make: () => kitFiles['MANIFEST.md']!,
      },
      // Whatever only this kit needs, and install.md names: Bootstrap's
      // _custom.scss, Ant Design's antd.theme.ts. Derived from what the engine
      // wrote, never listed, because a list is how they were left out.
      ...Object.keys(kitFiles).filter((path) => !KIT_COVERED.has(path) && path !== skillPath).map((path) => ({
        id: `kit-extra:${path}`, label: path, sub: 'install.md says where it goes', icon: <FileCode2 size={15} strokeWidth={1.75} />, file: path,
        how: [`${KIT_NAME[kit!]} needs this beside theme.css; install.md says how to use it.`],
        make: () => kitFiles[path]!,
      })),
    ] : []),
    {
      id: 'files',
      label: patched === null ? 'Preparing…' : patched.length ? `${patched.length} file${patched.length === 1 ? '' : 's'} changed` : 'Nothing changed yet',
      sub: 'your CSS and HTML, new values in place', icon: <FileCode2 size={15} strokeWidth={1.75} />, file: 'patched-files.txt',
      how: [
        'Your own files, whole, with the new values written in place.',
        'Use Everything (.zip) at the top right to get them as real files in their original folders, ready to diff.',
        'This is the complete change: a find and replace cannot tell a 12px radius from 12px of padding, and this can.',
      ],
      make: () => (patched ?? []).map((f) => `/* ===== ${f.path} ===== */\n${f.text}`).join('\n\n') || '/* Turn a knob first, then your CSS and HTML appear here with the new values written in. */',
    },
    {
      id: 'sheet-patch', label: 'Find and replace', sub: 'one line per value, per file', icon: <Replace size={15} strokeWidth={1.75} />, file: 'sandbox-patch.txt',
      how: [
        'One line per value: what it was, what it is now, and the file it sits in.',
        'Hand it to an agent ("apply this patch list to my source"), or run the replacements yourself.',
        'Shorter to read than the patched files, but blind to context: check radius against padding before replacing.',
      ],
      make: () => genPatch(table, vars),
    },
    {
      id: 'sheet-changed', label: 'Changed only', sub: 'just what you turned', icon: <Diff size={15} strokeWidth={1.75} />, file: 'sandbox-changes.css',
      how: [
        'The values you turned, under names of our own making.',
        'A reference to read, diff or hand over as a spec. It is not a drop-in stylesheet: your CSS never mentions these names, so pasting it on its own changes nothing.',
        'To make the change land, use Patch your own files.',
      ],
      make: () => genSheetCss(table, vars, { changedOnly: true }),
    },
    {
      id: 'sheet-css', label: 'Every value', sub: 'the whole sheet, as a list', icon: <Braces size={15} strokeWidth={1.75} />, file: 'sandbox-values.css',
      how: [
        'Every design value we found in the build, with how often it is used and where.',
        'The census behind everything else in this dialog. Useful to read, not to paste.',
      ],
      make: () => genSheetCss(table, vars),
    },
    {
      id: 'sheet-json', label: 'JSON', sub: 'the same, machine-readable', icon: <FileJson2 size={15} strokeWidth={1.75} />, file: 'sandbox-values.json',
      how: [
        'Every value with its kind, its old value, its new one, and the places it is used.',
        'For scripts and codemods: this is the sheet in the shape a program wants.',
      ],
      make: () => genSheetJson(table, vars),
    },
    {
      id: 'tokens-tw', label: 'Tailwind', sub: 'theme block for your config', icon: <Wind size={15} strokeWidth={1.75} />, file: 'tailwind.tokens.js',
      how: ['Paste into the theme block of your tailwind.config.', 'Names are ours, not your app\'s. This starts a system rather than patching one.'],
      make: () => genTailwind(cfg),
    },
    {
      id: 'tokens-shadcn', label: 'shadcn', sub: '--background, --primary, …', icon: <Boxes size={15} strokeWidth={1.75} />, file: 'shadcn.css',
      how: ['Replace the :root and .dark blocks in your globals.css with these.', 'The variable names are the ones shadcn/ui components already read.'],
      make: () => genShadcn(cfg),
    },
    {
      id: 'tokens-css', label: 'tokens.css', sub: 'a full --k-* system', icon: <SwatchBook size={15} strokeWidth={1.75} />, file: 'tokens.css',
      how: [
        'A complete token system seeded from your values: colour ramps, a type scale, spacing, z-index, breakpoints.',
        'Link it before your own stylesheet and build against the variables.',
        'These are new names, not the ones your app uses. To change the app you already have, use Patch your own files instead.',
      ],
      make: () => genCss(cfg),
    },
    {
      id: 'tokens-json', label: 'tokens.json', sub: 'the same system, as JSON', icon: <FileJson2 size={15} strokeWidth={1.75} />, file: 'tokens.json',
      how: ['The same generated system in JSON, with the decisions that produced it.', 'For the W3C interchange format, use Design tokens under Hand it to your agent.'],
      make: () => genJson(cfg),
    },
    {
      id: 'ios-swift', label: 'Swift', sub: 'constants for SwiftUI and UIKit', icon: <Apple size={15} strokeWidth={1.75} />, file: 'DesignTokens.swift',
      how: ['Drop into your Xcode target and reference the constants from SwiftUI or UIKit.'],
      make: () => genSwift(cfg),
    },
    {
      id: 'ios-assets', label: 'Asset catalog', sub: 'colour sets, light and dark', icon: <FolderTree size={15} strokeWidth={1.75} />, file: 'DesignTokens.xcassets.txt',
      how: ['Colour sets with light and dark variants.', 'Everything (.zip) writes these out as a real .xcassets folder you can drag into Xcode.'],
      make: () => genAssetCatalog(cfg).map((f) => `// ${f.path}\n${f.content}`).join('\n'),
    },
    {
      id: 'android-xml', label: 'colors.xml', sub: 'resources, light and night', icon: <Smartphone size={15} strokeWidth={1.75} />, file: 'colors.xml',
      how: ['The first block goes in res/values/colors.xml, the second in res/values-night/colors.xml.'],
      make: () => genAndroidColorsXml(cfg) + '\n' + genAndroidColorsXml(cfg, 'dark'),
    },
    {
      id: 'android-kt', label: 'Compose', sub: 'Kotlin constants', icon: <Smartphone size={15} strokeWidth={1.75} />, file: 'DesignTokens.kt',
      how: ['Drop into your theme package and reference from your Compose theme.'],
      make: () => genAndroidKotlin(cfg),
    },
  ], [cfg, table, vars, patched, projectName, notes, painted, anchors, movedCount, kitFiles, skillPath, kit])

  // Every dial carries its own unit, and printing them all as a multiplier
  // was wrong for four of them: weight moves in STEPS of 100, hue and gradient
  // angle in degrees, contrast and the tones in lightness. "×-1" for a weight
  // one step lighter is not a smaller way of saying it, it is a different
  // claim. `DIALS` already knows, so ask it.
  const UNIT_ELSE: Record<string, string> = { bgTone: 'ΔL' }
  const fmtDial = (key: string, x: unknown): string => {
    if (x === undefined) return 'as is'
    const v = String(x)
    if (!/^-?[\d.]+$/.test(v)) return v
    const n = Number(v)
    const unit = DIALS.find((d) => d.key === key)?.unit ?? UNIT_ELSE[key] ?? '×'
    if (unit === '×') return `×${v}`
    if (unit === '°') return `${v}°`
    if (unit === 'em') return `${v}em`
    return n > 0 ? `+${v}` : v          // steps and ΔL read as a signed offset
  }

  // The overview: which knobs stand off their code, from → to.
  //
  // The wording is the PANEL's, taken from `DIALS` rather than spelled again
  // here, because a row nobody can find again is worse than no row: splitting
  // the key on its capitals gave "Border Tone", "Grad Angle", "Sat" and
  // "C Accent" for knobs the panel calls Border tone, Gradient angle,
  // Saturation and Accent.
  // The wording is the PANEL's, taken from `DIALS` rather than spelled again
  // here, because a row nobody can find again is worse than no row: splitting
  // the key on its capitals gave "Border Tone", "Grad Angle", "Sat" and
  // "C Accent" for knobs the panel calls Border tone, Gradient angle,
  // Saturation and Accent.

  const turned = useMemo(() => {
    const out: Array<{ label: string; from: string; to: string; swatch?: boolean }> = []
    const add = (key: string, from: string, to: string) => {
      out.push({
        label: knobLabel(key),
        from, to, swatch: /^#/.test(to),
      })
    }
    const all = new Set([...Object.keys(base), ...Object.keys(cfg)]) as Set<keyof Config>
    for (const k of all) {
      const a = (base as unknown as Record<string, unknown>)[k as string], b = (cfg as unknown as Record<string, unknown>)[k as string]
      if (JSON.stringify(a) === JSON.stringify(b)) continue
      if (k === 'sb') {
        const sa = (a ?? {}) as Record<string, unknown>, sb = (b ?? {}) as Record<string, unknown>
        for (const dk of new Set([...Object.keys(sa), ...Object.keys(sb)])) {
          if (JSON.stringify(sa[dk]) === JSON.stringify(sb[dk])) continue
          add(dk, fmtDial(dk, sa[dk]), fmtDial(dk, sb[dk]))
        }
        continue
      }
      add(String(k), String(a), String(b))
    }
    return out
  }, [cfg, base])

  // Six destinations; the formats are tabs INSIDE one, never a wall of files.
  // Each destination names what it LANDS IN, at its own foot. The marks are the
  // fastest way to answer "is this the box for me" — a strip under the whole
  // panel could only say "we work with things".
  const DESTS = [
    // With a kit this is the whole package the merge brief calls "Design system
    // + Skill"; without one it says in a line why no skill comes with it, so
    // nobody goes looking for the file that was never going to be there.
    { title: kitFiles ? 'Design system + Skill' : 'Hand it to your agent',
      sub: kitFiles
        ? `DESIGN.md and a SKILL.md in ${KIT_NAME[kit!]}'s own classes, so Claude Code, Cursor or Codex builds in this look`
        : kit && kitError
          ? `DESIGN.md and one line in AGENTS.md. This build runs on ${KIT_NAME[kit]}, but its SKILL.md could not be written: ${kitError}`
          : kit
            ? `DESIGN.md and one line in AGENTS.md. Writing the SKILL.md in ${KIT_NAME[kit]}'s own classes…`
            : kit === null
              ? 'DESIGN.md and one line in AGENTS.md. No SKILL.md: this build runs on none of the nine kits, so there are no published classes for one to cite'
              : 'DESIGN.md and one line in AGENTS.md. Still reading which kit this build runs on…',
      icon: <Bot size={15} strokeWidth={1.75} />,
      ids: kitFiles ? ['design-md', 'skill-md', 'agents-md', 'dtcg', 'kit-theme', 'kit-install', 'kit-manifest', ...Object.keys(kitFiles).filter((p) => !KIT_COVERED.has(p) && p !== skillPath).map((p) => `kit-extra:${p}`)] : ['design-md', 'agents-md', 'dtcg'], reco: true,
      uses: [[M.claude, 'Claude Code'], [M.cursor, 'Cursor'], [M.openai, 'Codex'], [M.figma, 'Figma']] },
    { title: 'Patch your own files', sub: 'your CSS and HTML with the new values written in, or a find and replace list', icon: <FileCode2 size={15} strokeWidth={1.75} />, ids: ['files', 'sheet-patch'],
      uses: [[M.css, 'CSS'], [M.html, 'HTML'], [null, 'any repo']] },
    { title: 'The raw sheet', sub: 'every value we found and what it is now. A reference to read, not a stylesheet to paste', icon: <Braces size={15} strokeWidth={1.75} />, ids: ['sheet-changed', 'sheet-css', 'sheet-json'],
      uses: [[M.css, 'CSS'], [M.json, 'JSON']] },
    { title: 'Tailwind or shadcn', sub: 'a theme block for your config, or the block shadcn/ui components already read', icon: <Wind size={15} strokeWidth={1.75} />, ids: ['tokens-tw', 'tokens-shadcn'],
      uses: [[M.tailwind, 'Tailwind'], [M.shadcn, 'shadcn/ui'], [M.lovable, 'Lovable']] },
    { title: 'A fresh token system', sub: 'a full set seeded from these values, under new names. For starting a system, not patching one', icon: <SwatchBook size={15} strokeWidth={1.75} />, ids: ['tokens-css', 'tokens-json'],
      uses: [[M.css, 'CSS'], [M.json, 'JSON'], [null, 'Style Dictionary']] },
    { title: 'Native apps', sub: 'Swift constants, an asset catalog, Android resources', icon: <Smartphone size={15} strokeWidth={1.75} />, ids: ['ios-swift', 'ios-assets', 'android-xml', 'android-kt'],
      uses: [[M.swift, 'SwiftUI'], [M.android, 'Android']] },
  ]
  // On a kit there are no files of yours to patch and no sheet of yours to
  // read: what we tokenised is our own build of the kit. Its export is the
  // design system and the skill, then the other forms (merge phase 3).
  const OWN_FILES_ONLY = new Set(['Patch your own files', 'The raw sheet'])
  const dests = kitDoorName ? DESTS.filter((d) => !OWN_FILES_ONLY.has(d.title)) : DESTS
  const [active, setActive] = useState('overview')
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
  const [copied, setCopied] = useState(false)
  // Take it home (decision 216): one thing to do with it, for a maker whose
  // next step is their AI. The prompt carries the design system whole, so it
  // works pasted into any of them, not only the ones the MCP server reaches.
  const [aiCopied, setAiCopied] = useState(false)
  const copyForAi = async () => {
    const design = items.find((i) => i.id === 'design-md')?.make() ?? ''
    const skill = items.find((i) => i.id === 'skill-md')?.make()
    // theme.css first: it is the part an agent pastes; DESIGN.md and SKILL.md
    // keep pointing at it, and without it the prompt named a file it lacked
    const theme = kitFiles?.['theme.css']
    // the measured tells no knob reaches, in the same words as the standing
    // don'ts and without repeating them
    const MEASURED: Record<string, string> = { gradients: 'gradients as decoration', 'dark-only': 'a dark mode with no light one' }
    const donts = [...new Set([...tells.filter((t) => !t.knobs && MEASURED[t.id]).map((t) => MEASURED[t.id]!), ...LAYOUT_DONTS])]
    const prompt = [
      kitDoorName ? `Restyle this app, built on ${kitDoorName}, to the design system below. It was made in UISandbox.` : `Restyle ${projectName} to the design system below. It was made in UISandbox from this app's own build.`,
      `Use only its tokens${skill ? ' and the components SKILL.md names' : ''}. Do not fall back to the defaults, and add no raw colours, one-off sizes or new fonts.`,
      '', 'Keep the layout clear of the generic AI look. Avoid:',
      ...donts.map((d) => `- ${d}`),
      ...(theme ? ['', '--- theme.css (put this in your global stylesheet) ---', theme] : []),
      '', '--- DESIGN.md ---', design,
      ...(skill ? ['', '--- SKILL.md ---', skill] : []),
    ].join('\n')
    await navigator.clipboard.writeText(prompt)
    setAiCopied(true); setTimeout(() => setAiCopied(false), 2400)
  }
  const item = items.find((i) => i.id === active)
  const dest = item ? dests.find((d) => d.ids.includes(item.id)) : undefined
  const text = useMemo(() => item ? item.make() : '', [item])

  const download = (name: string, blob: Blob) => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = name
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 2000)
  }
  // The design system and the skill, as one zip: what a kit is exported as.
  const downloadKit = () => {
    if (!kitFiles) return
    download(`${(kitDoorName ?? projectName).replace(/[^\w.-]+/g, '-').replace(/^-|-$/g, '')}-design-system.zip`, zipSync(Object.entries(kitFiles).map(([name, text]) => ({ name, text }))))
  }
  const downloadAll = () => {
    const out = items.filter((i) => i.id !== 'files').map((i) => ({ name: i.file, data: i.make() }))
    for (const f of genAssetCatalog(cfg)) out.push({ name: f.path, data: f.content })
    for (const f of patched ?? []) out.push({ name: `patched/${f.path}`, data: f.text })
    // A map of the folder, first in the list: thirteen files and no README is
    // a puzzle handed to somebody who came here to save time.
    out.unshift({
      name: 'README.md',
      data: genReadme(projectName, items.filter((i) => i.id !== 'files').map((i) => ({ name: i.file, what: i.sub ?? i.label })), {
        moved: movedCount, total: table.entries.length, changedFiles: patched?.length ?? 0,
      }),
    })
    download(`${projectName.replace(/[^\w.-]+/g, '-')}-uisandbox.zip`, zipSync(out.map((f) => ({ name: f.name, text: f.data }))))
  }

  return (
    <div className="dialog__backdrop" onClick={onClose}>
      <div className="card dialog dialog--narrow" role="dialog" aria-label="Export" onClick={(e) => e.stopPropagation()}>
        <div className="dialog__head">
          {item ? (
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => { setActive('overview'); setCopied(false) }}><ChevronLeft size={14} /> Export</button>
          ) : (
            <h2>Take it home <span className="exp__h2sub">exactly what is in the sandbox</span></h2>
          )}
          <span className="stage__spacer" style={{ flex: 1 }} />
          <ShareButton url={shareUrl ?? null} />
          <button type="button" className="btn btn--ghost btn--icon" onClick={onClose} aria-label="Close"><X size={15} /></button>
        </div>
        {item ? (
          <div className="dialog__pane">
            <div className="exp__head">
              <span className="exp__ico exp__ico--lg">{dest?.icon}</span>
              <div><b>{dest?.title}</b><span className="exp__headsub">{dest?.sub}</span></div>
              <span className="stage__spacer" style={{ flex: 1 }} />
              <div className="exp__tabs" role="tablist">
                {(dest?.ids ?? []).map((id) => { const it = items.find((x) => x.id === id)!; return (
                  <button key={id} type="button" role="tab" aria-selected={id === active} className={`exp__tab ${id === active ? 'exp__tab--on' : ''}`} onClick={() => { setActive(id); setCopied(false) }}>{it.label}</button>
                ) })}
              </div>
            </div>
            <ol className="exp__how">
              {item.how.map((h, i) => <li key={i}>{h}</li>)}
            </ol>
            <pre>{text}</pre>
            <div className="dialog__tools">
              <span>{item.file} · {text.length.toLocaleString()} chars</span>
              <span className="stage__spacer" />
              <button type="button" className="btn btn--ghost btn--sm" onClick={async () => { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) }}>
                {copied ? <Check size={13} strokeWidth={2} /> : <Copy size={13} strokeWidth={2} />} {copied ? 'Copied' : 'Copy'}
              </button>
              <button type="button" className="btn btn--secondary btn--sm" onClick={() => download(item.file, new Blob([text], { type: 'text/plain' }))}><Download size={13} strokeWidth={2} /> Download</button>
            </div>
          </div>
        ) : (
          <div className="exp__overview">
            <div className="exp__home">
              {/* one line per way, saying when it is the one: the long sentence
                  under the row was read as "the zip adds a skill", while the
                  prompt already carries SKILL.md (decision 216) */}
              <div className="exp__homebtns">
                {send && (
                  <div className="exp__opt">
                    <SendButton to={send.to} onSend={send.onSend} />
                    <span className="exp__optnote">Straight to the agent in your project.</span>
                  </div>
                )}
                <div className="exp__opt">
                  <button type="button" className={`btn ${send ? 'btn--secondary' : 'btn--primary'} exp__homebtn`} onClick={() => void copyForAi()}>
                    {aiCopied ? <Check size={15} strokeWidth={2} /> : <Copy size={15} strokeWidth={2} />} {aiCopied ? 'Copied. Paste it into your AI' : 'Copy for your AI'}
                  </button>
                  <span className="exp__optnote">One paste and it restyles the app you have.</span>
                </div>
                <div className="exp__opt">
                  {kitDoorName
                    ? <button type="button" className="btn btn--secondary exp__homebtn" onClick={downloadKit} disabled={!kitFiles} title={kitFiles ? 'theme.css, DESIGN.md, SKILL.md, tokens.json, install.md and MANIFEST.md' : 'Writing the design system…'}><Download size={15} strokeWidth={2} /> Design system + Skill (.zip)</button>
                    : <button type="button" className="btn btn--secondary exp__homebtn" onClick={downloadAll}><Download size={15} strokeWidth={2} /> Everything (.zip)</button>}
                  <span className="exp__optnote">{kitDoorName
                    ? 'Kept in your repo, so screens you build later get the look too.'
                    : 'The changed files and every format, to apply by hand.'}</span>
                </div>
              </div>
              {!send && <p className="exp__homenote">Works in Claude Code, Cursor, Codex, Lovable and v0. To send it straight in, run <code>npx uisandbox-mcp open</code> in your project.</p>}
            </div>
            <div className="exp__stats">
              <div className="exp__stat"><b>{movedCount}</b><span>of {table.entries.length} values moved</span></div>
              {!kitDoorName && <div className="exp__stat"><b>{patched?.length ?? 0}</b><span>file{(patched?.length ?? 0) === 1 ? '' : 's'} changed</span></div>}
              <div className="exp__stat"><b>{turned.length}</b><span>knob{turned.length === 1 ? '' : 's'} turned</span></div>
            </div>
            <details className="exp__dest exp__more">
              <summary className="exp__sec">Other formats: your own files, Tailwind or shadcn, tokens, native</summary>
              <div className="exp__destgrid">
                {dests.map((d) => (
                  <button key={d.title} type="button" className="exp__card" onClick={() => { setActive(d.ids[0]!); setCopied(false) }}>
                    <span className="exp__ico">{d.icon}</span>
                    <span className="exp__text">
                      <span className="exp__label">{d.title}{d.reco && <em className="exp__reco">start here</em>}</span>
                      <span className="exp__sub2">{d.sub}</span>
                      <span className="exp__uses">
                        {d.uses.map(([mark, name]) => <span key={name as string} className="exp__use">{mark}{name}</span>)}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </details>
            {turned.length ? (
              <div className="exp__turned">
                <h3 className="exp__sec">Settings, from {kitDoorName ? 'the kit' : 'your code'} → the sandbox</h3>
                <div className="exp__cols">
                {turned.map((t, i) => (
                  <div key={i} className="exp__row">
                    <span className="exp__rowlabel">{t.label}</span>
                    <span className="exp__from">{/^#/.test(t.from) && <span className="fmrow__dot" style={{ background: t.from, width: 10, height: 10 }} />}{t.from}</span>
                    <span className="exp__arrow">→</span>
                    <span className="exp__to">{t.swatch && <span className="fmrow__dot" style={{ background: t.to, width: 10, height: 10 }} />}{t.to}</span>
                  </div>
                ))}
                </div>
              </div>
            ) : (
              <p className="exp__none">Nothing turned yet: every export is {kitDoorName ? `${kitDoorName} as it ships` : "your code's own stand"} (the identity). Turn a knob and this list says exactly what changed.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
