# HUG Learning

A learning tool for Hilltop Urban Gardens. A learner works through a set of questions. A wrong answer shows the correct answer with an explanation, and the question comes back around after the rest. This repeats until every question has been answered correctly. Anyone can also build a new set of questions in the browser and save it as a file.

The tool is plain HTML, CSS, and JavaScript. There is no build step and no server code, so it runs on GitHub Pages or any static host.

## Files

| Path | Purpose |
| --- | --- |
| `index.html` | The page. |
| `styles.css` | Styling, using the colors and typefaces from the main HUG site. |
| `app.js` | All behavior: loading, the learner flow, and the editor. |
| `curricula/` | Curriculum files. Each `.json` file here is one curriculum. |
| `curricula/index.json` | The list of curriculum files the page offers. See below. |
| `assets/` | The HUG logo and `preview.png`, the image shown when the site's link is pasted into a chat or social post. |
| `.github/workflows/pages.yml` | Optional. Publishes the site and rebuilds `curricula/index.json` on every push. |

## Using the tool

Open the page. You are asked to either load a curriculum or create one.

**Load a curriculum.** The page lists every curriculum it can find in the `curricula` folder. You can also open a curriculum file from your computer.

**Create a curriculum.** Give it a name and a description, then add questions. Each question is either single choice (one correct answer) or multiple choice (one or more correct answers). Mark the correct answers, write an explanation of the correct answer, and optionally add a short note on any incorrect option about why it is incorrect. Your draft is kept in the browser as you type. When you are done, use **Save** to download the curriculum file. A message then explains the two ways to use it: send the file to Maple to upload to the `curricula` folder so it appears for everyone, or open it yourself from the load screen with **Choose a file** when running the curriculum. **Try it out** runs the draft as a learner would see it. **Open from site** lists the curricula already in the `curricula` folder so you can edit one, and **Open from file** loads a saved file from your computer. When you edit an existing curriculum, saving keeps its file name so you can drop it back into the folder. The trash button clears the draft after asking you to confirm.

**Answering.** After each answer the tool shows whether it was right. On a wrong answer the correct options are highlighted, the explanation appears, and any incorrect option the learner picked shows its "why it is incorrect" note. The question is set aside and asked again in the next round. When every question has been answered correctly the page shows a completion message and asks the learner to wait.

## Adding a curriculum to the site

1. Save the file from the editor. It is named after the curriculum, for example `seed-saving-basics.json`.
2. Put the file in the `curricula` folder.
3. Make sure it is listed in `curricula/index.json`. The file is a plain list of file names:

   ```json
   [
     "welcome-to-hug.json",
     "seed-saving-basics.json"
   ]
   ```

   If you publish with the included GitHub Actions workflow, this step is automatic. The workflow rebuilds the list from whatever is in the folder every time you push.

4. Commit and push. The new curriculum appears on the load screen.

You can also edit a curriculum file by hand. The format is described at the end of this document.

## Publishing on GitHub Pages

Create a repository and push these files to the `main` branch. Then choose one of the two options below in the repository's **Settings** under **Pages**.

**Option A, automatic index.** Set **Source** to **GitHub Actions**. The workflow in `.github/workflows/pages.yml` runs on every push. It regenerates `curricula/index.json` from the files in the folder and publishes the site. You never edit the index by hand.

**Option B, no workflow.** Set **Source** to **Deploy from a branch**, pick `main` and the root folder. GitHub publishes the files as they are. Keep `curricula/index.json` up to date yourself whenever you add or remove a curriculum. You can delete the `.github` folder if you go this way.

Either way the site is available at `https://<your-account>.github.io/<repository>/`.

The link preview image lives at `assets/preview.png`. Link previews need its full address, which is set in the `og:image` and `twitter:image` tags near the top of `index.html`. It currently points at `https://maplesugarstone.github.io/hug-learning/`. If the site moves to a different address or a custom domain, update those two tags to match.

## Linking straight to a curriculum

Two optional settings can go in the page address.

- `?c=<file name>` opens a curriculum directly and skips the start screen. Example: `https://<account>.github.io/<repo>/?c=welcome-to-hug.json`
- `?embed=1` hides the site header and footer so the page fits inside another site.

Combine them with `&`: `?c=welcome-to-hug.json&embed=1`

## Testing locally

Open a terminal in this folder and run a small web server, for example:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000/` in a browser. The server's folder listing lets the page find curricula even without `index.json`.

Opening `index.html` directly from the file system also works for creating curricula and for opening curriculum files from your computer, but the list of curricula on the site stays empty because browsers do not allow the page to read other files that way.

## Curriculum file format

A curriculum is a JSON file with a title, a description, and a list of questions.

```json
{
  "title": "Seed saving basics",
  "description": "How and why we save seeds at the farm.",
  "questions": [
    {
      "type": "single",
      "prompt": "When is a bean pod ready for seed saving?",
      "options": [
        { "text": "When it is green and plump", "explanation": "Green pods are ready to eat, but the seeds inside are not mature." },
        { "text": "When it is dry and brittle on the plant", "correct": true },
        { "text": "Right after the flower drops" }
      ],
      "explanation": "Seeds finish maturing on the plant. Wait until the pod is dry and rattles."
    },
    {
      "type": "multiple",
      "prompt": "Which of these crops cross-pollinate easily? Select all that apply.",
      "options": [
        { "text": "Squash", "correct": true },
        { "text": "Corn", "correct": true },
        { "text": "Beans", "explanation": "Beans mostly self-pollinate, so different varieties can grow close together." }
      ],
      "explanation": "Squash and corn need distance or isolation between varieties to keep seed true to type."
    }
  ]
}
```

Fields:

- `title` and `description` describe the curriculum. The title is required.
- `questions` is the list of questions, asked in the order given.
- `type` is `"single"` for one correct answer or `"multiple"` for one or more. It defaults to `"single"`.
- `prompt` is the question text.
- `options` lists the answers. Each option has `text`, an optional `correct` flag, and an optional `explanation` that is shown when a learner picks that option and it is wrong.
- `explanation` on the question is shown with the correct answer.

A single choice question must have exactly one correct option. A multiple choice question must have at least one. Every question needs at least two options.
