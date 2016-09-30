# C2X - Confluence to XWiki Converter
Tool to convert Confluence to XWiki Syntax, in a manual or automatic manner.

## Features
- Manual Syntax Conversion
- Recursive page transfer from Confluence to XWiki
- Support for attachment transfer

## Requirements
- A web server capable of running python scripts
- Fairly recent browser
- Correctly configured access control headers in both wikis

##Installation
- Set up a web server with support for .py scripts (i.e. Apache with mod_cgi)
- Install required python modules (beautifulsoup4)
- Configure the Confluence and XWiki servers to send the Access-Control-Allow-Origin and Access-Control-Allow-Credentials headers

Example Apache configuration:
```
Header always set Access-Control-Allow-Origin "https://c2x.example.com"
Header always set Access-Control-Allow-Credentials true
Header add Access-Control-Allow-Headers "origin, x-requested-with, content-type, authorization"
Header add Access-Control-Allow-Methods "PUT, GET, POST, DELETE, OPTIONS"
```

- Copy the files from this repository to be accessible via the web server