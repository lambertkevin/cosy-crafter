# Cosy Crafter

## What is it

The Cosy Crafter application is offering a way to create custom podcasts based on selected pieces by the owner and user injected songs.

## Why is it useful

As a singlethreaded library, `libmp3lame` presents issues to scale this kind of application without having to use expensive cloud based solutions. This project will allow concurrent MP3 transcoding using all (or selected) cores of a machine to be used and make it possible for personnal computer to make available their own computing power to handle more transcoding and making high demand a smaller issue.

## Goal

Having a cheap solution to handle concurrent MP3 transcoding of 2+ hours, handling storage and distribution of APIs.

## Architecture

![diagram](https://i.imgur.com/PBq0Q3g.png)
_At this stage of the project, this is the used architecture. It will obviously evolve along with features._

## Stack

- REST Api microservices: `hapi@19`
- Websocket microservices: `express@4` + `socket-io@3`
- Transcoding microservice: `ffmpeg@latest` + `fluent-ffmpeg@2`
- Environment: `docker` + `docker-compose@2.4`

## Security

Each microservice has to register to an authority through `RSA` keys generated at build.
Transcoding workers and Pool service have their own set of `RSA` keys also generated at build, allowing outside of newtork registering of workers (making it possible for any personnal computer to make available its own computing power to create a 'cloud' impression).

## Origin

This idea comes from the creators of le [Cosy Corner](https://soundcloud.com/lecosycorner) and has been implemented with the help of my FFmpeg expert [Jean Noel Duquesne](https://github.com/JNoDuq) during the prototyping phase.

## To Do

[![Trello](https://img.shields.io/endpoint?style=for-the-badge&url=https%3A%2F%2Ftrello-cosy-crafter-x80lyv2bhqee.runkit.sh%2F)](https://trello.com/b/jxvlYk1I/cosy-crafter)

## UI

UI is a work in progress. You can see an idea of what it should look like right [here](https://i.imgur.com/S6YlIbr.png).
