# Activate and configure extensions
# https://middlemanapp.com/advanced/configuration/#configuring-extensions

activate :autoprefixer do |prefix|
  prefix.browsers = "last 2 versions"
end

# Layouts
# https://middlemanapp.com/basics/layouts/

# Per-page layout changes
page '/*.xml', layout: false
page '/*.json', layout: false
page '/*.txt', layout: false

require 'base_data'

BaseData::COUNTRY_TO_ISO_NAME.each do |country_iso, country_name|
  states = {}
  has_state_pages = BaseData::COUNTRY_STATE_DATA.include?(country_iso)
  if has_state_pages
    states = BaseData::COUNTRY_STATE_DATA[country_iso]
  end

  proxy "/country/#{country_iso.downcase}.html", "/country-template.html", :locals => {
    country_iso: country_iso,
    country_name: country_name,
    title: country_name,
    datasets: ["by_country/#{country_iso}"],

    has_state_pages: has_state_pages,
    states: states,
  }

  if has_state_pages
    proxy "/country/#{country_iso.downcase}/change.html", "/country-state-delta-template.html", :locals => {
      country_iso: country_iso,
      country_name: country_name,
      title: country_name,
      datasets: ["by_country/#{country_iso}"],
  
      has_state_pages: has_state_pages,
      states: states,
    }

    states.each do |state_code, state_name|
      proxy "/country/#{country_iso.downcase}/#{state_code.downcase}.html", "/state-template.html", :locals => {
        country_iso: country_iso,
        country_name: country_name,
        state_code: state_code,
        state_name: state_name,
        title: "#{state_name}, #{country_name}",
        datasets: ["by_country/#{country_iso}"],

        has_state_pages: has_state_pages,
        states: states,
      }
    end
  end
end

ignore '/country-template.html'
ignore '/country-state-delta-template.html'
ignore '/state-template.html'

# With alternative layout
# page '/path/to/file.html', layout: 'other_layout'

# Proxy pages
# https://middlemanapp.com/advanced/dynamic-pages/

# proxy(
#   '/this-page-has-no-template.html',
#   '/template-file.html',
#   locals: {
#     which_fake_page: 'Rendering a fake page with a local variable'
#   },
# )

# Helpers
# Methods defined in the helpers block are available in templates
# https://middlemanapp.com/basics/helper-methods/

# helpers do
#   def some_helper
#     'Helping'
#   end
# end

# Build-specific configuration
# https://middlemanapp.com/advanced/configuration/#environment-specific-settings

# configure :build do
#   activate :minify_css
#   activate :minify_javascript
# end

set :site_url, ""

configure :build do
  # Relative assets needed to deploy to Github Pages
  activate :relative_assets
  # set :site_url, "/covid-19-graphics"
end