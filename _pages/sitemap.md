---
layout: archive
title: "Sitemap"
permalink: /sitemap/
author_profile: true
---

{% include base_path %}

A concise map of the public pages on this site. For crawlers, an [XML version]({{ base_path }}/sitemap.xml) is also available.

<ul>
  <li><a href="{{ base_path }}/">Home</a></li>
  <li><a href="#visitor-stats">Visitor Stats</a></li>
  <li><a href="{{ base_path }}/terms/">Terms and Privacy Policy</a></li>
  <li><a href="{{ base_path }}/sitemap.xml">XML Sitemap</a></li>
</ul>

<section class="home-section home-visitor-stats" id="visitor-stats" aria-labelledby="visitor-stats-heading" data-visitor-stats>
  <div class="home-section__header">
    <p class="home-section__kicker">Visitors</p>
    <h2 id="visitor-stats-heading">Visitor Stats</h2>
  </div>
  <div class="home-visitor-stats__grid" aria-live="polite">
    <div class="home-visitor-stat">
      <span class="home-visitor-stat__label">Total home visits</span>
      <button class="home-visitor-stat__count" type="button" data-country-stats-open aria-haspopup="dialog" aria-controls="country-stats-dialog">
        <strong data-visitor-count>Loading</strong>
      </button>
    </div>
    <div class="home-visitor-stat">
      <span class="home-visitor-stat__label">Your location</span>
      <strong data-visitor-location>Loading</strong>
    </div>
  </div>
  <p class="home-visitor-stats__note" data-visitor-note>
    Location is approximate and based on the network address visible to the browser.
  </p>
</section>

<div class="home-visitor-modal" id="country-stats-dialog" role="dialog" aria-modal="true" aria-labelledby="country-stats-heading" data-country-stats-dialog hidden>
  <button class="home-visitor-modal__backdrop" type="button" data-country-stats-close aria-label="Close visitor country stats"></button>
  <div class="home-visitor-modal__panel">
    <div class="home-visitor-modal__header">
      <div>
        <p class="home-section__kicker">Visitor IP Stats</p>
        <h2 id="country-stats-heading">Visits by Country</h2>
      </div>
      <button class="home-visitor-modal__close" type="button" data-country-stats-close aria-label="Close visitor country stats">×</button>
    </div>
    <div class="home-visitor-country-stats" data-country-stats-body>
      <p class="home-visitor-country-stats__status" data-country-stats-status>Loading country stats...</p>
    </div>
    <p class="home-visitor-modal__note">
      Countries are inferred from visitor IP geolocation and counted only after this feature is enabled.
    </p>
  </div>
</div>

<script src="{{ base_path }}/assets/js/visitor-stats.js" data-visitor-display-path="/" defer></script>
