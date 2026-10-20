# Monit Sharma - Portfolio

This repository contains the source code for my personal academic portfolio website.

## Tech Stack
- **Jekyll**: Static site generator.
- **Liquid**: Templating language.
- **SCSS**: Styling.

## Structure
- `_data/`: Contains content for Profile, Experience, Publications, etc.
- `_layouts/`: Page templates.
- `_includes/`: Shared navigation, footer, and publication rows.
- `assets/css/`: Custom styles.
- `index.html`: Brief introduction and recent updates.
- `research.html`, `projects.html`, `writing.html`, `about.html`: Focused pages.
- `work/`: Detailed project pages with methods, results, and figures.

## Running Locally
```bash
bundle install
bundle exec jekyll serve
```

## Updating publications

Edit `_data/publications.yml` to add or update a paper. The Research page reuses
the original publication rows, journal/conference/preprint badges, and link pills.
All papers are shown initially; category filters are powered by `rd-home.js`.

Use `category: journal`, `conference`, or `preprint`; `order` sets the display
order within a category. Each paper has a title, year, meta line, description
list (Markdown emphasis is supported), optional venue and selected flag, and
links with `text` and `url`. Keep all publication links in the YAML.

Run `bundle exec jekyll serve` and open `http://localhost:4000/portfolio/`.
Jekyll rebuilds when the YAML changes; refresh the browser to see the update.
Serve the Jekyll output, since the source home page now contains Liquid templates.

Projects are listed from `_data/projects.yml` and link to their individual pages
under `work/`. Writing draws from `_data/essays.yml` and `_data/blogs.yml`.

Project cards are ordered by `updated_at`, newest first. Set this field when adding
a project, and advance it when its content, results, or figures change, for example
`updated_at: "2026-10-20T10:00:00+08:00"`. Use the same timestamp format and timezone
throughout. Projects with equal timestamps retain their order in the data file.
Project numbering and Previous/Next links follow the same order as the cards.

The shared editorial layout keeps the existing palette and local fonts from
`redesign.css`; `editorial.css` supplies page framing; the original design system styles the
publication rows, project cards, timelines, and interactive Bloch sphere. Existing
home-page anchors redirect to their corresponding pages.

For a local preview without changing the tracked `_site/` files, use
`bundle exec jekyll serve --host 127.0.0.1 --destination /private/tmp/monit-portfolio-preview --disable-disk-cache`.
