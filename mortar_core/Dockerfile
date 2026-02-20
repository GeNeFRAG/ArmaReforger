FROM nginx:alpine

# Copy static files to nginx html directory
COPY index.html /usr/share/nginx/html/
COPY BallisticCalculator.js /usr/share/nginx/html/
COPY ballistic-data.json /usr/share/nginx/html/
COPY ui_js/ /usr/share/nginx/html/ui_js/
COPY www/ /usr/share/nginx/html/www/
COPY icon.png /usr/share/nginx/html/
COPY arma-reforger-logo.png /usr/share/nginx/html/

# Expose port 80
EXPOSE 80

# nginx serves files by default from /usr/share/nginx/html
