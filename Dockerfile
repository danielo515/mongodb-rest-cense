FROM node
MAINTAINER Daniel Rodriguez Rivero 

  WORKDIR /app
  ADD . /app
  RUN npm install  

  #Expose the port
  EXPOSE 3000
  
  ENV VCAP_APP_HOST="0.0.0.0"
  
  CMD ["npm", "start"]