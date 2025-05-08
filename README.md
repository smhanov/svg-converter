# SVG to Image Converter

A microservice that converts SVG files to various image formats (PNG, JPEG, WebP) using Node.js and Puppeteer.

## Features

- Converts SVG files to PNG, JPEG, or WebP formats
- Supports various SVG units (px, em, rem, pt, pc, cm, mm, in, %)
- Automatically detects SVG dimensions from viewBox or width/height attributes
- Respects maximum width and height constraints
- Supports content negotiation for output format
- Browser pool with configurable concurrency
- Web interface for easy testing and conversion

## Prerequisites

- Node.js 18 or higher
- npm
- Docker (optional)

## Installation

### Local Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

### Docker Installation

1. Build the Docker image (make sure you're in the project directory):
   ```bash
   docker build -t svg-converter .
   ```
   Note: The `.` at the end is important - it tells Docker to look for the Dockerfile in the current directory.

2. Run the container:
   ```bash
   docker run -d \
     -p 3000:3000 \
     -e SERVER_PORT=3000 \
     -e MAX_CONCURRENCY=2 \
     --name svg-converter \
     svg-converter
   ```

## Configuration

The server can be configured using environment variables:

- `SERVER_PORT`: The port number the server will listen on (default: 3000)
- `MAX_CONCURRENCY`: Maximum number of concurrent browser instances (default: 2)

### Docker Environment Variables

When running with Docker, you can set environment variables using the `-e` flag:

```bash
docker run -d \
  -p 3000:3000 \
  -e SERVER_PORT=3000 \
  -e MAX_CONCURRENCY=4 \
  --name svg-converter \
  svg-converter
```

## Usage

### Web Interface

The server provides a web interface for easy testing and conversion. Simply open your browser and navigate to:

```
http://localhost:3000
```

The web interface allows you to:
- Upload SVG files
- Set desired output dimensions
- Choose output format (PNG, JPEG, WebP)
- Preview the converted image
- Download the result

### API Usage

You can also use the API directly with curl:

```bash
curl -X POST \
  -F "svg=@file.svg" \
  -F "width=800" \
  -F "height=600" \
  -H "Accept: image/png" \
  http://localhost:3000/ \
  --output output.png
```

### Supported Image Formats

The service supports the following output formats, specified via the `Accept` header:

- `image/png` (default)
- `image/jpeg`
- `image/webp`

## Error Handling

The service returns appropriate HTTP status codes and error messages:

- 400: Bad Request (missing file, invalid dimensions)
- 500: Internal Server Error

## File Size Limits

The maximum file size for SVG uploads is 10MB.

## Docker Commands

### Build the Image
```bash
# Make sure you're in the project directory
docker build -t svg-converter .
```

### Run the Container
```bash
docker run -d -p 3000:3000 --name svg-converter svg-converter
```

### Stop the Container
```bash
docker stop svg-converter
```

### Remove the Container
```bash
docker rm svg-converter
```

### View Logs
```bash
docker logs svg-converter
```

### View Container Status
```bash
docker ps -a | grep svg-converter
``` 