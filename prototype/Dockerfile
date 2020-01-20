FROM alpine
RUN apk add --update ffmpeg nodejs npm
COPY . /app
WORKDIR /app
CMD ["npm", "i"]
CMD ["node","src/index.js"]