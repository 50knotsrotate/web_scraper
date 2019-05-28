const express = require("express");
const app = express();
const cheerio = require("cheerio");
const axios = require("axios");
const request = require("request");
var allData = [];
var id = 1; //for giving an ID to a school
const JSON = require("circular-json");
app.use(express.json());

app.get("/data", (req, resp) => {
  //For each page on the homepage
  for (let i = 1; i < 10; i++) {
    //Load that page for scraping
    axios
      .get(`https://www.coursereport.com/schools?page=${i}`)
      .then(async response => {
        //   console.log(allData.length)
        //Load the page and save it in a cheerio
        let $ = cheerio.load(response.data);

        //Get all elements with a className of .school-header
        //These are what contain the links for each school
        const allUrls = $(".school-header");

        //Loop through each page(didnt use .length because it was breaking and I feel lazy. Will fix later)
        for (var i = 0; i < allUrls.length - 1; i++) {
          //Get the url for a particualr school
          const url = await allUrls[i].children[0].children[0].attribs.href;

          //And load up that page
          request(
            `https://www.coursereport.com${url}`,
            async (err, res, html) => {
              var name;

              //Load up a schools page
              const $2 = await cheerio.load(html);

              //First we will get the name of the school.
              try {
                name = await $2("h1[class=resize-header]")[0].children[0].data;
              } catch (err) {}

              //Get schools perks. Need empty array bc you cant map in this library
              var perks = [];

              try {
                perk = $2(".glyphicon-ok-circle");

                for (let i = 0; i < perk.length; i++) {
                  if (perk[i].next.data) {
                    perks.push(perk[i].next.data);
                  }
                }
                // console.log(perks);
              } catch (err) {
                // perk = null;
              }

              //Now we need description
              var description;
              try {
                description = $2("p", ".expandable" || "")[0].children[0].data;
              } catch (err) {
                description = "No description available";
              }

              //and start the schools object.
              allData.push({
                name,
                id,
                perks,
                description
              });
              id++;

              //This gets all course info for a school, which we will pick further along
              const courses = $2("li", ".course-card");

              //For each course
              for (let j = 0; j < courses.length; j++) {
                //Set up variables
                var courseName;
                var locations;
                var cost;
                var technologiesLearned = [];

                try {
                  //Literally just the name of a course for a school
                  courseName =
                    courses[j].children[0].children[0].children[0].data;

                  //The school we are currently working on. Filter needed for for loop issues with axios
                  const newCourse = allData.findIndex(
                    school => school.name == name
                  );
                  var technologies = $2("a", ".details");
                  for (let i = 0; i < technologies.length; i++) {
                    technologiesLearned.push(technologies[i].children[0].data);
                  }

                  //If the school has a courses property, push the new course name. If not, create it and add the course name
                  allData[newCourse].courses
                    ? allData[newCourse].courses.push({
                        name: courseName,
                        technologiesLearned,
                        rating: null
                      })
                    : (allData[newCourse].courses = [
                        { name: courseName, technologiesLearned, rating: null }
                      ]);

                  //This gets the locations for each course. An array
                  locations = courses[
                    j
                  ].children[1].children[1].children[7].children[0].children[0].data.split(
                    ","
                  );

                  allData[newCourse].courses[
                    allData[newCourse].courses.length - 1
                  ].locations = locations;

                  //Get the cost of the course
                  cost =
                    courses[j].children[1].children[1].children[3].children[1]
                      .children[0].data;

                  //Sometimes cost isnt available and node cries at me, so if its not there, just make it null.
                  allData[newCourse].courses[
                    allData[newCourse].courses.length - 1
                  ].cost = cost || null;
                } catch (err) {}
              }
              //I decided to cut it off at 300. Thats enough for now.
              if (allData.length === 600) {
                console.log("done");
                return resp.status(200).send(allData.filter(course => course.courses && course.courses.length));
              } else {
                console.log(
                  `${Math.floor((allData.length / 600) * 100)}% done`
                );
              }
            }
          );
        }
      });
  }
});

app.listen(4000, () => {
  console.log("Listening on port 4000");
});
