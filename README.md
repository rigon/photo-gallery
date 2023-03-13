Photo Gallery
=============

Photo Gallery is a self-hosted performant application to organize your photos. Built with speed in mind with React and Go, you can view your stored photos easily.


## Motivation

many projects despite being open source, they its own way of storing the data, making it hard to change the app if you want to use another one.
support for iphone live photos and support for HEIC and H265
easy and quick to navigate between albums
lightweight, so it could run on small device as a Raspberry PI

## Goals

**Built around the file system:** photos are loaded from albums. Data is preserved as-is in the filesystem. Changes you make later are saved as transparently as possible, like as choosing your favorites. No requirement to be tied to a database.

**Performant:** no need for initial and regular scans. Thumbnails are used to see a large amount of photos at a time and are automatically generated on-the-fly.

**Made for photography:** for everyone that enjoys taking photos and revisiting precious memories captured through them.

**Ease of use:** navigation through albums as easy as possible, with 


So, few concepts to keep in mind about how things are organized:
- **Albums** are folders in the filesystem and the images inside are the photos of the album
- **Collection** is a set of albums, in other words, is the location where your collection is stored
- **Pseudo Album** is special type of album, is file stored in the filesystem which contains links for the photos. This way you can organize your favorites without duplicating them

## Features

Main features:

- [X] Multiple collections
- [X] Easy navigation between albums
- [X] Light, Dark and System-defined themes
- [X] iPhone Live Photos
- [X] Access through WebDAV
- [X] Automatic transcoding on-the-fly for required formats
  - [X] for images
  - [ ] for videos
- [X] Image files supported:
  - [X] JPEG, GIF, PNG, BMP, TIFF, VP8, VP8L, WEBP, HEIF/HEIC
  - [ ] RAW (DNG, Apple ProRaw)
- [X] Video files supported:
  - [X] Containers: MP4, MOV, AVI
  - [X] Codecs: H264, H265
- [X] Thumbnails generation (on-the-fly or in background)
- [X] Pseudo albums:
  - [X] Create
  - [X] Save favorite photos
- [ ] Multiple seleciton in the gallery:
  - [ ] Move photos between albums
  - [ ] Delete
  - [ ] Save favorites in bulk
- [ ] Upload photos
- [ ] Authentication
- [ ] Metadata extraction (EXIF)
- [ ] Photos timeline with virtual scroll
- [ ] Show locations in a map
- [ ] Face recognition and aggregation by person


## Usage

Server help:

    Usage of ./photo-gallery:
      -b, --cache-thumbnails         Generate thumbnails in background when the application starts
      -c, --collection stringArray   Specify a new collection. Example name=Photos,path=/photos,thumbs=/tmp
                                     List of possible options:
                                        index          Position in the collection list
                                        name           Name of the collection
                                        path           Path to load the albums from
                                        thumbs         Path to store the tumbnails
                                        hide=false     Hide the collection from the list (does not affect webdav)
                                        rename=true    Rename files instead of overwriting them
                                        readonly=false
           --disable-webdav           Disable WebDAV

### Port forwarding on Terminus under iOS

- https://support.termius.com/hc/en-us/articles/900006226306-I-can-t-use-the-iOS-app-in-the-background
- https://support.termius.com/hc/en-us/articles/4402044543897#location


## Development

### Build docker multi-arch

    docker buildx build --push -t rigon/photo-gallery --platform linux/amd64,linux/arm/v6,linux/arm/v7,linux/arm64/v8,linux/ppc64le,linux/s390x .


### Available Scripts

In the project directory, you can run:

- `npm start` or `npm run dev`
  
  Runs the app in the development mode.\
  Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

  The page will reload when you make changes.
  You may also see any lint errors in the console.

- `npm run server`
  
  Builds and runs the server.\
  Open [http://localhost:3080](http://localhost:3080) to view it in your browser.

  The web version served is the production build obtained with `npm run build`

- `npm test`

  Launches the test runner in the interactive watch mode.\
  See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

- `npm run build`

  Builds the app for production to the `build` folder.\
  It correctly bundles React in production mode and optimizes the build for the best performance.
  
  The build is minified and the filenames include the hashes.\
  Your app is ready to be deployed!

  See the section about [deployment](https://vitejs.dev/guide/static-deploy.html) for more information.


## Contribute

Contributions to this project are very welcome, by reporting issues or just by sharing your support. That means the world to me!

Please help me maintaining this project, only with your support I can take the time to make it even better. Look here for more info https://www.rigon.tk/#contribute

<!--
### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify) -->
