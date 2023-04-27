Photo Gallery
=============

Photo Gallery is a self-hosted performant application to organize your photos. Built with speed in mind with React and Go, you can browse through your photos quick and easy.

## Motivation

There are a lot of photo gallery projects out there. However they often have their own unique way of storing data so you don't really have control how it is organized, not just the photos themselves, but also like albums, favorites and other preferences alongside. All of this must be kept transparent and accessible.

Another key feature of project is its ease of use, an app that was intuitive and quick to navigate between albums and thousands of photos. And projects that have a good array of features they could be improved upon in this regard.

It was important as well supporting a wide range of data formats, including [iPhone Live Photos](https://support.apple.com/en-us/HT207310) (HEIC images and H.265 video). With so many different types of devices and formats, it can be a challenge to keep all of your photos organized in one place.

Finally, an app that is lightweight and could run on small devices like a Raspberry Pi.

To sum up, the reason for this project is to be open sourced, you owning your own data and supporting a wide range of data formats all with an easy navigation and a lightweight design.


## Goals

**Built around the file system:** photos are loaded from albums. Data is preserved as-is in the filesystem. Changes you make later are saved as transparently as possible, like as choosing your favorites. No requirement to be tied to a database. If you decide for another solution you should own all your data.

**Performant:** no need for initial and regular scans. Thumbnails are used to see a large amount of photos at a time and are automatically generated on-the-fly.

**Made for photography:** for everyone, amateur or professional, that enjoys taking photos and revisiting precious memories captured through them.

**Ease of use:** navigation through albums as easy as possible


## Features

First, few concepts to keep in mind about how things are organized:
- **Albums** are folders in the filesystem and the images inside are the photos of the album
- **Collection** is a set of albums, in other words, is the location where your collection is stored
- **Pseudo Album** is special type of album, is file stored in the filesystem which contains links for the photos. This way you can organize your favorites without duplicating them

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
- [X] Show storage info
- [X] Metadata extraction from photos (EXIF)
- [X] Show photo location in a map
- [ ] Organize photos in bulk:
  - [ ] Upload new photos
  - [X] Move photos
  - [X] Delete photos
  - [X] Save favorites
  - [ ] Easy selection
- [ ] Authentication
- [ ] Photos timeline with virtual scroll
- [ ] View all places from photos in a map
- [ ] Search for duplicates
- [ ] Tool for renaming files
- [ ] Image resizing according with screen


## Build and Run

First, clone the project:

    git clone https://github.com/rigon/photo-gallery.git
    cd photo-gallery

Then, build the web interface and the server:

    npm install
    npm run build
    npm run build-server

To start the server:

    npm run server

Once started, open [http://localhost:3080](http://localhost:3080) to view it in your browser.

Optionally you can open [http://localhost:3080/webdav](http://localhost:3080/webdav) in the file explorer as well.

## Usage

Server help:

    Usage of ./server/photo-gallery:
      -b, --[no-]cache-thumbnails   Generate missing thumbnails while scanning (default true)
      -c, --collection strings      Specify a new collection. Example name=Photos,path=/photos,thumbs=/tmp
                                    List of possible options:
                                      index          Position in the collection list
                                      name           Name of the collection
                                      path           Path to load the albums from
                                      thumbs         Path to store the thumbnails
                                      db             Path to cache DB, if a filename is provided it will be located in thumbnails directory
                                      hide=false     Hide the collection from the list (does not affect webdav)
                                      rename=true    Rename files instead of overwriting them
                                      readonly=false
          --disable-scan            Disable scans on start, by default will cache photo info of new albums
          --disable-webdav          Disable WebDAV
          --full-scan               Perform a full scan on start (validates if cached data is up to date)
      -h, --host string             Specify a host (default "localhost")
      -p, --port int                Specify a port (default 3080)
      -r, --recreate-cache          Recreate cache DB, required after DB version upgrade
          --workers-info int        Number of concurrent workers to extract photos info (default 2)
          --workers-thumb int       Number of concurrent workers to generate thumbnails, by default number of CPUs

### Docker

This project is distributed docker ([Photo Gallery Docker Hub page](https://hub.docker.com/r/rigon/photo-gallery)).

The following example illustrates a case where you have two folders mounted with volumes, one with the collection of photos that is read-only and a recent folder with your still unorganized photos that is writable.

```sh
docker run -d -p 3080:3080 --restart=always --name photo-gallery \
-v photo-gallery_data:/thumbs \
-v /media/data/photos/:/photos/:ro \
-v /media/data/recent/:/recent/:rw \
rigon/photo-gallery \
-c "name=Photos,path=/photos,thumbs=/thumbs" \
-c "name=Recent,path=/recent,thumbs=/thumbs"
```

If you prefer Docker Compose, here is the same example:

```yml
version: "3"

volumes:
  photo-gallery_data:

services:
  photo-gallery:
    image: rigon/photo-gallery
    volumes:
      - photo-gallery_data:/thumbs
      - /media/data/photos/:/photos/:ro
      - /media/data/recent/:/recent/:rw
    ports:
      - 3080:3080
    command:
      - "-cname=Photos,path=/photos,thumbs=/thumbs"
      - "-cname=Recent,path=/recent,thumbs=/thumbs"
```

`photo-gallery_data` can be safely deleted, however cached data must be regenerated.

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

- `npm run server` and `npm run server-dev`
  
  Builds and runs the server.\
  Open [http://localhost:3080](http://localhost:3080) to view it in your browser.

  The web version served is the production build obtained with `npm run build`

  `server-dev` is the same, but monitors for changes and reloads automatically

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
