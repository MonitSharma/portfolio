# Monit Sharma - Portfolio

This repository contains the source code for my personal academic portfolio website.

## Tech Stack
- **Jekyll**: Static site generator.
- **Liquid**: Templating language.
- **SCSS**: Styling.

## Structure
- `_data/`: Contains content for Profile, Experience, Publications, etc.
- `_layouts/`: Page templates.
- `_includes/`: Reusable components (Sidebar).
- `assets/css/`: Custom styles.

## Running Locally
```bash
bundle install
bundle exec jekyll serve
```

## Updating publications

Edit `_data/publications.yml` to add or update a paper. The home page uses
`_includes/publications.html` and `_includes/publication-card.html` to generate
cards, category counts, the preprint toggle, headline publication totals, and
structured publication metadata at build time.

Use `category: journal`, `conference`, or `preprint`; `order` sets the display
order within a category. Each paper has a title, year, meta line, description
list (Markdown emphasis is supported), optional venue and selected flag, and
links with `text` and `url`. Keep all publication links in the YAML.

Run `bundle exec jekyll serve` and open `http://localhost:4000/portfolio/`.
Jekyll rebuilds when the YAML changes; refresh the browser to see the update.
Serve the Jekyll output, since the source home page now contains Liquid templates.

The Work section's `project-nav` links jump to the project IDs in `index.html`.
When adding a project, give its `software-project` container a unique ID and add
its link to that menu.
