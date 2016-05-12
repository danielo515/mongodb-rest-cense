FROM readytalk/nodejs

  WORKDIR /app
  ADD package.json /app/
  RUN npm install
  ADD . /app

  #Expose the port
  EXPOSE 3000
  CMD []
  ENTRYPOINT ["/nodejs/bin/npm", "start"]
