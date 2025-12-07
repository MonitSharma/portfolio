---
layout: default
---

<section id="about">
  <h2 class="section-title">About Me</h2>
  <div class="about-content">
    <p>{{ site.data.profile.bio | newline_to_br }}</p>
  </div>
</section>

<section id="news">
  <h2 class="section-title">Recent News</h2>
  <ul class="news-list">
    {% for item in site.data.news %}
    <li>
      <span class="news-date">{{ item.date | date: "%b %Y" }}</span>
      <span class="news-content">{{ item.content | markdownify | remove: '<p>' | remove: '</p>' }}</span>
    </li>
    {% endfor %}
  </ul>
</section>

<section id="experience">
  <h2 class="section-title">Experience</h2>
  {% for job in site.data.experience %}
  <div class="item-card">
    <div class="item-header">
      <h3 class="item-title">{{ job.role }}</h3>
      <span class="item-meta">{{ job.period }}</span>
    </div>
    <div class="item-subtitle">{{ job.company }} &middot; {{ job.location }}</div>
    <ul class="item-details">
      {% for highlight in job.highlights %}
      <li>{{ highlight | markdownify | remove: '<p>' | remove: '</p>' }}</li>
      {% endfor %}
    </ul>
  </div>
  {% endfor %}
</section>

<section id="publications">
  <h2 class="section-title">Selected Publications</h2>
  {% assign selected_pubs = site.data.publications | where: "selected", true %}
  {% for pub in selected_pubs %}
  <div class="pub-card selected-pub">
    {% if pub.image %}
    <div class="pub-image">
      <img src="{{ pub.image | relative_url }}" alt="{{ pub.title }}">
    </div>
    {% endif %}
    <div class="pub-content">
      <div class="pub-title">{{ pub.title }}</div>
      <div class="pub-meta">
        {{ pub.meta }}
        {% if pub.venue %}
        <br><span class="venue-tag">{{ pub.venue }}</span>
        {% endif %}
      </div>
      <ul class="pub-desc">
        {% for desc in pub.description %}
        <li>{{ desc | markdownify | remove: '<p>' | remove: '</p>' }}</li>
        {% endfor %}
      </ul>
      <div class="pub-links">
        {% for link in pub.links %}
        <a href="{{ link.url }}" target="_blank" rel="noopener">
          {% if link.icon %}<i class="{{ link.icon }}"></i>{% endif %} {{ link.text }}
        </a>
        {% endfor %}
      </div>
    </div>
  </div>
  {% endfor %}

  <h3 class="section-subtitle">Other Publications</h3>
  {% assign other_pubs = site.data.publications | where_exp: "item", "item.selected != true" %}
  {% for pub in other_pubs %}
  <div class="pub-card">
    <div class="pub-title">{{ pub.title }}</div>
    <div class="pub-meta">
      {{ pub.meta }}
      {% if pub.venue %}
      <br><span class="venue-tag">{{ pub.venue }}</span>
      {% endif %}
    </div>
    <ul class="pub-desc">
      {% for desc in pub.description %}
      <li>{{ desc | markdownify | remove: '<p>' | remove: '</p>' }}</li>
      {% endfor %}
    </ul>
    <div class="pub-links">
      {% for link in pub.links %}
      <a href="{{ link.url }}" target="_blank" rel="noopener">
        {% if link.icon %}<i class="{{ link.icon }}"></i>{% endif %} {{ link.text }}
      </a>
      {% endfor %}
    </div>
  </div>
  {% endfor %}
</section>

<section id="blogs">
  <h2 class="section-title">Blogs</h2>
  {% for blog in site.data.blogs %}
  <div class="item-card">
    <div class="item-header">
      <h3 class="item-title">
        <a href="{{ blog.url }}" target="_blank" rel="noopener" style="color: inherit; text-decoration: none; hover: text-decoration: underline;">
          {{ blog.title }}
        </a>
      </h3>
      <span class="item-meta">{{ blog.date }}</span>
    </div>
    <div class="item-subtitle">
      {% for tag in blog.tags %}
      <span class="venue-tag" style="font-size: 0.75rem; padding: 0.1rem 0.5rem; margin-right: 0.3rem;">{{ tag }}</span>
      {% endfor %}
    </div>
    <ul class="item-details">
      <li>{{ blog.summary }}</li>
    </ul>
  </div>
  {% endfor %}
</section>

<section id="education">
  <h2 class="section-title">Education</h2>
  {% for edu in site.data.education %}
  <div class="item-card">
    <div class="item-header">
      <h3 class="item-title">{{ edu.degree }}</h3>
      <span class="item-meta">{{ edu.year }}</span>
    </div>
    <div class="item-subtitle">{{ edu.university }}</div>
  </div>
  {% endfor %}
</section>
