# SVG to Image Converter Service

A service that converts SVG files to various image formats (PNG, JPEG, WebP) using Puppeteer for high-quality rendering.

## Features

- Convert SVG files to PNG, JPEG, or WebP formats
- Maintain aspect ratio while scaling to requested dimensions
- Web interface for easy testing and conversion
- Browser pool for efficient resource management
- Configurable concurrency and timeouts

## Why Use a Browser for SVG Conversion?

This service uses a headless browser (Puppeteer) to render SVG files because:

1. Modern browsers have the most complete and accurate SVG rendering engines
2. They support all SVG features including:
   - Complex paths and shapes
   - Gradients and patterns
   - Filters and effects
   - CSS styling
   - JavaScript animations
   - External resources
3. They handle SVG units and viewport calculations correctly
4. They support all SVG attributes and elements

While running a browser on a server adds complexity, it ensures the highest quality and most accurate SVG rendering possible.

## Prerequisites

- Node.js 18 or higher
- npm
- Docker (optional)

## Installation

### Direct Installation

1. Install Node.js (version 18 or higher)
2. Clone this repository:
   ```bash
   git clone <repository-url>
   cd svgdraw
   ```
3. Install dependencies:
   ```bash
   npm install
   ```

### Configuration

The service can be configured using environment variables:

- `SERVER_HOST`: Host address to bind the server to (default: '0.0.0.0')
- `SERVER_PORT`: Port to run the server on (default: 3000)
- `MAX_CONCURRENCY`: Maximum number of concurrent browser instances (default: 2)
- `RENDER_TIMEOUT`: Maximum time in milliseconds to wait for SVG rendering (default: 10000)

Example:
```bash
export SERVER_HOST=127.0.0.1  # Only accept local connections
export SERVER_PORT=3000
export MAX_CONCURRENCY=4
export RENDER_TIMEOUT=30000  # 30 seconds timeout
```

Common host values:
- `0.0.0.0`: Accept connections from any network interface (default)
- `127.0.0.1`: Only accept local connections
- `localhost`: Only accept local connections
- Specific IP address: Only accept connections from that interface

## Usage

### Running the Server

Start the server:
```bash
npm start
```

The server will be available at `http://<SERVER_HOST>:<SERVER_PORT>` (default: `http://0.0.0.0:3000`).

### Web Interface

Access the web interface at the root URL (`/`) to:
- Upload SVG files
- Set output dimensions
- Choose output format (PNG, JPEG, WebP)
- Preview and download converted images

### API Usage

Convert SVG to image using a POST request:

```bash
curl -X POST \
  -F "svg=@input.svg" \
  -F "width=800" \
  -F "height=600" \
  -H "Accept: image/png" \
  http://localhost:3000
```

Parameters:
- `svg`: SVG file to convert
- `width`: Desired output width
- `height`: Desired output height
- `Accept`: Output format (image/png, image/jpeg, or image/webp)

### Load Testing

Run a load test to check performance:
```bash
npm run load-test
```

## Docker Installation

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
     -e SERVER_HOST=0.0.0.0 \
     -e SERVER_PORT=3000 \
     -e MAX_CONCURRENCY=2 \
     --name svg-converter \
     svg-converter
   ```

   To map a different host port (e.g., 8080) to the container's port 3000:
   ```bash
   docker run -d \
     -p 8080:3000 \
     -e MAX_CONCURRENCY=2 \
     --name svg-converter \
     svg-converter
   ```
   The format is `-p HOST_PORT:CONTAINER_PORT`. The container always uses port 3000 internally, but you can map it to any available port on your host machine.

## Configuration

The server can be configured using environment variables:

- `SERVER_HOST`: Host address to bind the server to (default: '0.0.0.0')
- `SERVER_PORT`: Port to run the server on (default: 3000)
- `MAX_CONCURRENCY`: Maximum number of concurrent browser instances (default: 2)

### Docker Environment Variables

When running with Docker, you can set environment variables using the `-e` flag:

```bash
docker run -d \
  -p 3000:3000 \
  -e SERVER_HOST=0.0.0.0 \
  -e SERVER_PORT=3000 \
  -e MAX_CONCURRENCY=4 \
  -e RENDER_TIMEOUT=30000 \
  --name svg-converter \
  svg-converter
```

Note: When running in Docker, it's recommended to keep `SERVER_HOST=0.0.0.0` to allow connections from outside the container.

## Error Handling

The service handles various error cases:
- Invalid SVG files
- Missing or invalid dimensions
- Rendering timeouts (configurable, default: 10 seconds)
- File size limits (10MB)

## Common Issues

1. **Browser Launch Failures**
   - Ensure system has required dependencies for Puppeteer
   - Check available system resources

2. **Memory Usage**
   - Adjust `MAX_CONCURRENCY` based on available system memory
   - Monitor browser pool size and cleanup

3. **Rendering Timeouts**
   - Complex SVGs may exceed the configured timeout
   - Consider increasing `RENDER_TIMEOUT` for complex SVGs
   - Consider optimizing SVG complexity if timeouts persist

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Docker Commands

### Build the Image
```bash
# Make sure you're in the project directory
docker build -t svg-converter .
```

### Run the Container
```bash
# Map host port 3000 to container port 3000
docker run -d -p 3000:3000 --name svg-converter svg-converter

# Or map a different host port (e.g., 8080) to container port 3000
docker run -d -p 8080:3000 --name svg-converter svg-converter
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