$(document).ready(function () {

  // Representatives Gloabal variables
  let federal_pattern = "ocd-division/country:us";
  let state_pattern = /ocd-division\/country:us\/state:(\D{2}$)/;
  let cd_pattern = /ocd-division\/country:us\/state:(\D{2})\/cd:/;
  let sl_pattern = /ocd-division\/country:us\/state:(\D{2})\/(sldl:|sldu:)/;
  let county_pattern = /ocd-division\/country:us\/state:\D{2}\/county:\D+/;
  let local_pattern = /ocd-division\/country:us\/state:\D{2}\/place:\D+/;
  let district_pattern = /ocd-division\/country:us\/district:\D+/;
  let federal_offices = ['United States Senate', 'United States House of Representatives'];

  // placeholder images
  let blankImage = "./assets/images/blank.png";
  let eventBlank = "./assets/images/event.png";
  
  // Address Autocomplete
  const initAddressRepresentative = function () {
    google.maps.event.addDomListener(window, 'load', function () {
      var places = new google.maps.places.Autocomplete(document.getElementById('address'));
      google.maps.event.addListener(places, 'place_changed', function () {
        let place = places.getPlace();
        let address = place.formatted_address;
        let add = encodeURIComponent(address);
        representativesSearch(add);
      });
    });
  };

  // Sets up autocomplete for address search
  initAddressRepresentative();

  // Represent Search Button
  $(document).on("click", "#search", function () {
    let address = $("#address").val().trim();
    if (address && address !== "") {
      representativesSearch(encodeURIComponent(address));
    } 
  });

  //==== ADDRESS SEARCH FUNCTION
  function representativesSearch(address) {

    let key = 'AIzaSyBM-uVbiniH-X5n5wmUhB1zJ4O9VNl57ok';
    let myUrl = 'https://www.googleapis.com/civicinfo/v2/representatives?';
    let urlString = `${myUrl}key=${key}&address=${address}`;

    $.ajax(url = urlString, method = 'GET').then(function (response) {
     
      let officeName;
      let officialName;
      let image;
      let party;

      let selected_state = '';
      let selected_county = '';
      let selected_local = '';
      let all_people = {};
      let pseudo_id = 1;
      
      let divisions = response.divisions;
      let officials = response.officials;
      let offices = response.offices;

      let federal_people = [];
      let state_people = [];
      let county_people = [];
      let local_people = [];

      clearPreviousResults();

      if (divisions === undefined) {
        appendNoResultFound("#results-state");
      } else {

        $("#address-image").html(`<img class="img-responsive img-thumbnail" src="https://maps.googleapis.com/maps/api/staticmap?size=800x300&maptype=roadmap&markers=${address}&key=AIzaSyB-hbAFUSdbFonA-MiskuCZclPbDN4Z3u0" alt=""/> `)

        $.each(divisions, function (division_id, division) {
          if (typeof division.officeIndices !== 'undefined') {

            $.each(division.officeIndices, function (i, office) {
              let office_name = offices[office];

              $.each(offices[office]['officialIndices'], function (i, official) {
                let info = {
                  'person': null,
                  'office': office_name,
                  'phones': null,
                  'urls': null,
                  'emails': null,
                  'division_id': division_id,
                  'pseudo_id': pseudo_id
                };

                let person = officials[official];
                info['person'] = person;

                if (typeof person.phones !== 'undefined') {
                  info['phones'] = person.phones;
                }
                if (typeof person.urls !== 'undefined') {
                  info['urls'] = person.urls;
                }
                if (typeof person.emails !== 'undefined') {
                  info['emails'] = person.emails;
                }
                if (checkFederal(division_id, office_name)) {
                  info['jurisdiction'] = 'Federal Government';
                  federal_people.push(info);
                } else if (checkState(division_id)) {
                  info['jurisdiction'] = selected_state;
                  state_people.push(info);
                } else if (checkCounty(division_id)) {
                  info['jurisdiction'] = selected_county;
                  county_people.push(info);
                } else {
                  info['jurisdiction'] = selected_local;
                  local_people.push(info);
                }
                all_people[pseudo_id] = info;
                pseudo_id = pseudo_id + 1;

              });
            });
          }
        });
      }
      countyPersonInfo(county_people);
      localPersonInfo(local_people);
      statePersonInfo(state_people);
      federalPersonInfo(federal_people);
    }).catch(function(error) {
        clearPreviousResults();
        appendErrorRepresentative("#results-local");
    });
  };

  // Local Representatives Bucket
  const localPersonInfo = function (local_people) {
    if (local_people.length > 0) {
      $("#local-header").append("<h1> Local Representatives </h1>");
      let resultLoc = "#results-local";
      for (let key in local_people) {
        appendRepresentativeResults(resultLoc, key, local_people);
      }
    }
  };

  // County Representatives Bucket
  const countyPersonInfo = function (county_people) {
    if (county_people.length > 0) {
      $("#county-header").append("<h1> County Representatives </h1>");
      let resultLoc = "#results-county";
      for (let key in county_people) {
        appendRepresentativeResults(resultLoc, key, county_people);
      }
    }
  };
  // State Representatives Bucket
  const statePersonInfo = function (state_people) {
    if (state_people.length > 0) {
      $("#state-header").append("<h1> State Representatives </h1>");
      let resultLoc = "#results-state";
      for (let key in state_people) {
        appendRepresentativeResults(resultLoc, key, state_people);
      }
    }
  };

  // Federal Representatives Bucket
  const federalPersonInfo = function (federal_people) {
    if (federal_people.length > 0) {
      $("#federal-header").append("<h1> Federal Representatives </h1>");
      let resultLoc = "#results-federal";
      for (let key in federal_people) {
        appendRepresentativeResults(resultLoc, key, federal_people);
      }
    }
  };

  // Filter for federal representatives
  const checkFederal = function (division_id, office_name) {
    if (division_id == federal_pattern ||
      cd_pattern.test(division_id) ||
      federal_offices.indexOf(office_name.name) >= 0)
      return true;
    else
      return false;
  };

  // Filter for state representatives
  const checkState = function (division_id) {
    if (state_pattern.test(division_id) ||
      sl_pattern.test(division_id))
      return true;
    else
      return false;
  };

  // Filter for county representatives
  const checkCounty = function (division_id) {
    if (county_pattern.test(division_id))
      return true;
    else
      return false;
  };

  //Append Representative Data
  const appendRepresentativeResults = function (resultLoc, key, representatives) {

    $(resultLoc).append(`<div class="col-lg-4 col-md-4 col-sm-6 col-xs-12 card-deck">
                          <div class="card">
                          <img class="card-img-top"
                          src = "${representatives[key].person.photoUrl ? representatives[key].person.photoUrl : blankImage}
                          "/>
                        <div class="card-body">
                          <h3 class="card-title" id="rep-name">${representatives[key].person.name ? representatives[key].person.name : "N/A"}</h3>
                          <p class="card-text" id="rep-office">${representatives[key].office.name ? representatives[key].office.name : "N/A"}</p>
                          <p class="card-text" id="rep-party">${representatives[key].person.party ? representatives[key].person.party : "N/A"}</p>
                          <p class="card-text" id="rep-phone">${representatives[key].person.phones ? representatives[key].person.phones[0] : "N/A"}</p>
                          <p class="card-text" id="rep-email">${representatives[key].emails ? representatives[key].emails : "N/A"}</p>
                        </div>
                      </div></div>`)
  };

  // clearing previously loaded representative results
  const clearPreviousResults = function () {
    $("#address-image").empty();
    $("#local-header").empty();
    $("#results-local").empty();
    $("#county-header").empty();
    $("#results-county").empty();
    $("#results-federal").empty();
    $("#results-state").empty();
    $("#federal-header").empty();
    $("#state-header").empty();
  };

  // Events Address Autocomplete
  const initAddressEvents = function () {
    google.maps.event.addDomListener(window, 'load', function () {
      var eventPlace = new google.maps.places.Autocomplete(document.getElementById('addressEvents'));
      google.maps.event.addListener(eventPlace, 'place_changed', function () {
        let place = eventPlace.getPlace();
        clearPreviousEventsResults();
        if (place.geometry) {
          let latitude = place.geometry.location.lat();
          let longitude = place.geometry.location.lng();
          searchEventsNearMe(latitude, longitude);
        }
      });
    });
  };

  // Sets up autocomplete for events address search
  initAddressEvents();

  // Finds coordinates based on the address
  const findCoordinates = function (address) {
    clearPreviousEventsResults();
    let googleCoordinates = "https://maps.googleapis.com/maps/api/geocode/json";
    key = `AIzaSyCvzo41OTxNaNCRdixEDqiqC_ENZnx4mrE`;
    url = `${googleCoordinates}?key=${key}&address=${address}`;
    $.ajax(url = url, method = 'GET').then(function (response) {
     if (response.results.length > 0) {
        let location = response.results[0].geometry.location;
        let latitude = location.lat;
        let longitude = location.lng;
        searchEventsNearMe(latitude, longitude);
      } else {
        clearPreviousEventsResults();
        appendNoResultFound("#eventsResult");
      }
    }).catch(function () {
      clearPreviousEventsResults();
      appendErrorEvents("#eventsResult");
    });;
  };

  //=== Event Search Button ==//
  $(document).on("click", "#searchEvent", function (event) {
    event.preventDefault();
    let address = $("#addressEvents").val().trim();
    if (address && address !== "") {
      findCoordinates(encodeURIComponent(address));
    }
  });

  // Event Search AJAX.
  const searchEventsNearMe = function (latitude, longitude) {
    let url = `https://www.eventbriteapi.com/v3/events/search/`;
    let param1 = `politics`;
    let param2 = `venue`;
    let param3 = 'date';
    let param4 = "20mi";
    let token = `6KIBNWQ7Q6BCI7O4X7ESC34F3A45UVO3EPZZ2QMA7BEUBO5M2Z`;
    let eventUrl = `${url}?token=UEJIH7SJNP5SWIVJUDC7&q=${param1}&expand=${param2}&location.latitude=${latitude}&location.longitude=${longitude}&sort_by=${param3}&location.within=${param4}`;
    let eventDomLoc = "#eventsResult";
    $.ajax(url = eventUrl, headers = {
      'Content-Type': 'application/json'
    }, crossDomain = true, method = 'GET').then(function (response) {
      if (response.events.length > 0) {
        clearPreviousEventsResults();
        for (let i = 0; i < response.events.length; i++) {
          appendEventResults(i, response, eventDomLoc);
        }
      } else {
        clearPreviousEventsResults();
        appendNoResultFound(eventDomLoc);
      }
    }).catch(function () {
      clearPreviousEventsResults();
      appendErrorEvents(eventDomLoc);
    });
  };

  //Append Event Results
  const appendEventResults = function (iter, response, eventDomLoc) {
    $(eventDomLoc).append(`<div class="col-md-12 col-sm-12 col-xs-12 card-columns">
                      <div class="card event-card bills-card">
                       <img class = "card-img-events"
                       src = "${response.events[iter].logo ? response.events[iter].logo.original.url : eventBlank}"
                       alt = "image-not-found"
                       "/>
                   <div class="card-body">
                       <h3 id="event-name">${response.events[iter].name.text ? response.events[iter].name.text : ""}</h3>
                    <div class="desc-text">
                       <p class="event-desc" style="overflow:scroll; height:200px;">${response.events[iter].description.text}</p>
                    </div>
                    <div class="event-date">
                       <p id="event-start">Event Start: ${response.events[iter].start.local ? moment(response.events[iter].start.local).format('LLLL') : ""}</p>
                       <p id="event-end">Event End: ${response.events[iter].end.local ? moment(response.events[iter].end.local).format('LLLL') : ""}</p>
                       <p id="event-address">Address: ${response.events[iter].venue.address.localized_address_display}</p>
                   </div>
               </div>
              </div>
           </div>`)
  };

  // clearing previously loaded representative results
  const clearPreviousEventsResults = function () {
    $("#eventsResult").empty();
  };

  //=== Bills Search Button ===//
  $(document).on("click", "#searchBills", function () {
    let subject = $("#billsSearch").val().trim();
    if (subject && subject !== "") {
      searchBills(subject);
    }
  });

  //===  Bills FUNCTION ===//
  const searchBills = function (subject) {

    let url = `https://api.propublica.org/congress/v1/bills/subjects/`;
    let key = `1AVq9dC52my1FvlrE5fgv1pgltyxBtSGGlJNy8vW`;
    let searchUrl = `${url}${subject}.json`;
    let billLocation = "#billLocation";
    $(billLocation).empty();
    $("#billsSearch").val('');
    $(".loader").show();
    $.ajax({
      type: "GET",
      url: searchUrl,
      beforeSend: function (xhr) {
        xhr.setRequestHeader('X-API-Key', key);
      },
      success: function (response) {
        $(".loader").hide();
        if (response['200'] === 'OK' && response.status !== "ERROR") {
          for (let i = 0; i < response.results.length; i++) {
            appendBillsResults(i, response, billLocation);
          }
        } else if (response.status === "ERROR") {
          appendNoResultFound(billLocation);
        } else {
          appendError(billLocation);
        }
      },
      error: function (response) {
        appendError(billLocation);
      }
    });
  };

  //Append Bills Results
  const appendBillsResults = function (iter, response, billLocation) {
    $(billLocation).append(`<div class="col-sm-12 col-md-12 col-xs-12 card-column">
                      <div class="card event-card bills-card">
                      <div class="bills-info">
                       <p id="bill-name">${response.results[iter].primary_subject ? response.results[iter].primary_subject : ""}</p>
                       <p class="bill-title">${response.results[iter].title ? response.results[iter].title : ""}</p>
                       <p id="bill-summary" class="${response.results[iter].summary ? "bill-desc" : ""}">${response.results[iter].summary ? response.results[iter].summary : ""}</p>
                       <p id="bill-govtrack"><a href="${response.results[iter].govtrack_url}" target="_blank">${response.results[iter].govtrack_url ? response.results[iter].govtrack_url : ""}</a></p>
                       <p id="bill-sponserName">Sponsor: ${response.results[iter].sponsor_name ? response.results[iter].sponsor_name : ""}</p>
                       <p id="bill-sponserName">Party Type: ${response.results[iter].sponsor_party ? response.results[iter].sponsor_party : ""}</p>
                   </div>
                   </div>
           </div>`)
  };

  // No Results returned from api
  const appendNoResultFound = function (location) {
    $(location).append(`<div class="no-results text-center"> No results found for the search criteria</div>`);
  };

  // Errors returned from api
  const appendError = function (location) {
    $(location).append(`<div class="no-results text-center"> Something went wrong. Try again later</div>`);
  };

  const appendErrorRepresentative = function (location) {
    $(location).append(`<div class="no-results text-center"> Something went wrong. Try again later. </br> Make Sure Address is a valid USA address </div>`);
  };

  const appendErrorEvents = function (location) {
    $(location).append(`<div class="no-results text-center"> Something went wrong. Try again later. </br> Make Sure Address is a valid USA address </div>`);
  };

  //===Scroll to Top Fucntion ==//
  window.onscroll = function () {
    scrollFunction();
  };

  // scroll function
  const scrollFunction = function () {
    if (document.body.scrollTop > 200 || document.documentElement.scrollTop > 200) {
      $("#myBtn").show();
    } else {
      $("#myBtn").hide();
    }
  };

  // Scroll on top button click
  $(document).on('click', '#myBtn', function () {
    $("html, body").animate({
      scrollTop: 0
    }, 600);
  });

});