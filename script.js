const api_url_base = 'https://scrambler-api.onrender.com'

async function fetchPostWrapper(url_endpoint, params, response_function, error_function=null) {
    const full_url = `${api_url_base}${url_endpoint}` // endpoint starts with '/'
    const requestOptions = {
        method: 'POST',
        // credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      };
    if (params) {
        requestOptions['body'] = JSON.stringify(params)
    }

    let return_value = await fetch(full_url, requestOptions)
      .then(response => {
          if (!response.ok) {
            throw response;
          }
            const contentType = response.headers.get('Content-Type');
            if (contentType && contentType.includes('application/json')) {
                // .json() from queries.js can't return results.rows[0]. gets unexpected end of json
                return response.json(); 
            } 
            return null
        })
        .then(data => {
            // if no function supplied, ignore
            if (response_function) {
                response_function(data)
                return
            } else {
                return data
            }
            
        })
        .catch(errorResponse => {
            if (errorResponse.name) { // javascript error
                errorResponse = {
                    name: errorResponse.name,
                    message: errorResponse.message,
                    stack: errorResponse.stack ? errorResponse.stack : 'none'
                }
            }
            const errorparams = {
                payload: params,
                route: url_endpoint,
                errorResponse: errorResponse,
            }


            if (errorResponse.status >= 400 && errorResponse.status < 500) {
                const contentType = errorResponse.headers.get("content-type");
                if (contentType && contentType.indexOf("application/json") !== -1) {
                    errorResponse.json().then(errorData => {
                        if (errorData.err) {
                            toast(true, errorData.err)
                        } else {
                            errorparams['errorData'] = errorData
                            fetchPostWrapper('/logerror', errorparams, null, function() {return})
                            
                        }
                    });
                } else {
                    fetchPostWrapper('/logerror', errorparams, null, function() {return})
                }
                
                // Only display the alert for 4XX client errors
                
            } else { // 500 errors are all for internal server errors. 
                fetchPostWrapper('/logerror', errorparams, null, function() {return})
            }

            if (error_function) {
                error_function(errorResponse, errorparams)
                return
            }

        })
    return return_value
}

function openModal(modal_name, event) {
    let modal = document.getElementById(modal_name)
    modal.classList.remove('closed')

    if (modal_name == 'event_form') {
        // set event_form athlete and training_day
        modal.setAttribute('athlete_id', '')
    }
}

function closeModal(modal_name) {
    document.getElementById(modal_name).classList.add('closed')
    clearForm(modal_name)
}

function clearForm(modal_name) {
    let modal = document.getElementById(modal_name)
    let inputs = modal.querySelectorAll('input')
    if (inputs.length) {
        inputs.forEach((input) => {
            if (input.getAttribute('type') != 'submit') {
                input.value = ''
            }
        })
    }
    
    let non_default_buttons = modal.querySelectorAll('.non_default')
    if (non_default_buttons.length) {
        non_default_buttons.forEach((button) => {
            button.textContent = ''
        })
    }
}

function getFormValue(form_name, value_label) {
    let form = document.getElementById(form_name)
    let input = form.querySelector(`[name=${value_label}]`)

    if (input) {
        return input.value
    }
    return null
}

function setNewAthleteForm({ team_name }) {
    setAthleteFormTeam(team_name)

    let save_button = createSaveButton(createAthlete, ['athlete_form'])
    document.getElementById('athlete_save_button_holder').appendChild(save_button)
}

function setAthleteFormTeam(team_name) {
    let team_select_doms = site_interface.createTeamOptions() // array of dom elements

    let form_team = document.getElementById('form_athlete_team')
    
    form_team.textContent = ''

    team_select_doms.forEach((dom_el) => {
        if (dom_el.getAttribute('value') == team_name) {
            dom_el.selected = true
        }
        form_team.appendChild(dom_el)
    })
}

function setEditAthleteForm(athlete) {
    // set athlete team-name
    let team_name = site_interface.findTeamName(athlete.team_id)
    setAthleteFormTeam(team_name)

    // set athlete name, level, age, focus
    document.getElementById('form_athlete_name').value = athlete.name
    document.getElementById('form_athlete_level').value = athlete.level
    document.getElementById('form_athlete_age').value = athlete.age
    document.getElementById('form_athlete_focus').value = athlete.focus.join(', ')

    let save_button = createSaveButton(athlete.save, ['athlete_form'])
    document.getElementById('athlete_save_button_holder').appendChild(save_button)

    // expose delete button. set eventHandler to this athlete
    let delete_button = createDeleteButton(athlete, ['athlete_form'], site_interface.listAthletes)
    document.getElementById('athlete_delete_button_holder').appendChild(delete_button)
    
    // replace create button with save. On modal close, delete buttons are removed, replace save with create and remove event handler
}

function createDeleteButton(thing, windows_to_close, navigateAfterDelete) {
    // delete button always opens a confirmation. that confirmation modal's delete button is also fed which windows to close afterwards
    
    let button = document.createElement('button')
    button.classList.add('delete_button')
    button.innerText = 'Delete'

    button.addEventListener('click', function eventHandler() {
        openConfirmDeleteWindow(thing, windows_to_close, navigateAfterDelete)

    })

    return button
    
}

function openConfirmDeleteWindow(thing, modals_to_close, navigateAfterDelete) {
    let name = thing.name // only athletes right now
    document.getElementById('confirm_delete_name').innerText = name

    let confirm_delete_button = document.createElement('button')
    confirm_delete_button.classList.add('confirm_delete_button')
    confirm_delete_button.innerText = 'Delete'

    let confirm_delete_holder = document.getElementById('confirm_delete_holder')
    confirm_delete_holder.appendChild(confirm_delete_button)

    confirm_delete_button.addEventListener('click', async function eventHandler() {
        if (document.getElementById('confirm_delete_input').value == 'delete') {
            // reset input to empty
            document.getElementById('confirm_delete_input').value = ''

            // delete object. removes from DB and site_interface
            await thing.delete()

            if (modals_to_close && modals_to_close.length) {
                modals_to_close.forEach((modal) => {
                    closeModal(modal)
                })
            }
            closeModal('confirm_delete_modal')
            if (navigateAfterDelete) {
                navigateAfterDelete()
            } else {
                site_interface.refreshCurrentPage()
            }
            
        }

    })

    openModal('confirm_delete_modal')
}

function createReturnButton(return_function) {
    let button = document.createElement('button')
    button.innerText = 'Back'
    button.classList.add('back')
    button.addEventListener('click', return_function)
    return button
}

function createAddButton(elementType, default_params) {
    let row = document.createElement('div')
    row.classList.add('row', 'add')

    let button = document.createElement('div')
    button.classList.add('add_button')

    let span = document.createElement('span')
    span.innerText = `Add an ${elementType}`

    row.appendChild(button)
    row.appendChild(span)

    switch (elementType) {
        case 'athlete':
            button.addEventListener('click', function(e) {
                openModal('athlete_form', e)
                setNewAthleteForm(default_params) // save button isn't fed an athlete
            })
            break;
        case 'event':
            button.addEventListener('click', function(e) {
                openModal('event_form', e)
            })
            break;
        case 'activity':
            button.addEventListener('click', function(e) {
                openModal('activity_form', e)
            })
            break;
    }
    return row
}

function createSaveButton(save_function, windows_to_close, navigateAfterSave) {
    // save function can be obj.save or createAthlete etc.
    let button = document.createElement('button')
    button.classList.add('save_button')
    button.innerText = 'Save'
    button.addEventListener('click', async function() {
        await save_function()

        // close form
        windows_to_close.forEach((modal) => {
            closeModal(modal)
        })

        // reload page
        if (navigateAfterSave) {
            navigateAfterSave()
        } else {
            site_interface.last_load()
        }
    })
    
    return button
}

function createElementWithText(e_type, text) {
    let el = document.createElement(e_type)
    el.innerText = text
    return el
}

document.querySelectorAll('.close').forEach((button) => {
    button.addEventListener('click', (e) => {
        let parent_modal = e.target.getAttribute('for')
        closeModal(parent_modal)
    })
})

document.getElementById("activity_form_form").addEventListener('submit', async function(e) {
    let activity = await createActivity(e)
    let event_obj = site_interface.current_training_day.event_objects[activity.event]
    event_obj.activities.push(activity)

    let caller_id = document.getElementById('activity_form').getAttribute('caller')
    let button_row = document.getElementById(caller_id).querySelector('.row.add')
    document.getElementById(caller_id).insertBefore(activity.createDOM(), button_row)    

    closeModal('activity_form')
})

function getFormContents(form_id) {
    let form = document.getElementById(form_id)
    let results = {}
    form.querySelectorAll('input').forEach((input) => {
        let input_name = input.getAttribute('name')
        let input_value = input.value

        if (input.getAttribute('type') == 'number') {
            input_value = parseInt(input_value)
        }

        results[input_name] = input_value
    })
    form.querySelectorAll('select').forEach((select) => {
        let select_name = select.getAttribute('name')
        form.querySelectorAll('option').forEach((option) => {
            if (option.selected) {
                let select_value = option.value
                results[select_name] = select_value
            }
        })
    })
    
    return results
}

function processAthleteForm() {
    let { name, level, age, team_name, focus } = getFormContents('athlete_form_form')
    focus = JSON.stringify(focus.split(', ')) // turn into list
    let team_id = site_interface.all_teams.filter(obj => obj.team_name == team_name)[0]['id']

    return { name, age, level, focus, team_id }
}

async function createAthlete() {
    // manages both Create and Update
    // if athlete_id is provided, obj already exists

    // send data to server
    let params = processAthleteForm() // { name, age, level, focus, team_id }

    let results = await fetchPostWrapper('/training/athletes/create', params)
    params['id'] = results['id']

    let new_athlete = new Athlete(params)
    return false
}

async function createActivity(e) {
    e.preventDefault()

    let caller_event_id = document.getElementById('activity_form').getAttribute('caller')
    let event = caller_event_id.slice(6) // remove 'event_'

    let focus = getFormValue('activity_form_form', 'focus')
    let exercise_name = getFormValue('activity_form_form', 'exercise')
    let sets = getFormValue('activity_form_form', 'sets')
    let reps = getFormValue('activity_form_form', 'reps')
    let rep_type = getFormValue('activity_form_form', 'rep_type')

    let activity = new Activity({ sets, reps, rep_type, exercise_name, event })
    // add activity to event. // site interface needs to keep track of current athlete and day

    return activity
}

class siteInterface {
    constructor() {
        this.current_team = null
        this.current_athlete = null
        this.current_training_day = null
        
        this.all_teams = []
        this.all_athletes = []

        this.last_load = null
        
    }

    // loading functions
    loadTeams = async () => {
        this.all_teams = []
        let team_data = await fetchPostWrapper('/training/teams/get') // team_name, schedule
        team_data.forEach((team) => {
            let team_obj = new Team(team)
            this.all_teams.push(team_obj)
        })
    }
    loadAthletes = async () => {
        this.all_athletes = []
        let athlete_data = await fetchPostWrapper('/training/athletes/get')

        if (athlete_data) {
            athlete_data.forEach((athlete) => {
                athlete = new Athlete(athlete) // assumes that teams have been loaded.
            })
        }
    }

    // create form elements
    createTeamOptions = () => {
        let elements = []
        this.all_teams.forEach(team => {
            let option_dom = document.createElement('option')
            option_dom.value = team.team_name
            option_dom.innerText = team.team_name
            elements.push(option_dom)
        })
        return elements
    }

    // lookups
    findTeamName = (team_id) => {
        let filtered_teams = this.all_teams.filter(obj => obj.id == team_id)
        
        if (filtered_teams.length > 1) {
            alert(`There's more than one team with that name??`)
        }
        if (!filtered_teams.length) {
            return null
        }
        return filtered_teams[0]['team_name']
    }

    replaceInterface = async (new_elements) => {
        let d_interface = document.getElementById('default_interface')
        d_interface.textContent = ''

        d_interface.appendChild(new_elements)
    }
    listTeams = async () => {
        if (!this.all_teams.length) {
            await this.loadTeams()
        }   
        

        let new_elements = document.createElement('div')

        this.all_teams.forEach((team) => {
            let team_dom = team.createDOM()
            new_elements.appendChild(team_dom)
        })
        this.replaceInterface(new_elements)

        this.page = 'team_list'

        this.last_load = this.listTeams
    }
    listAthletes = async (team, return_function) => {
        // are we changing teams?
        if (team) {
            this.current_team = team
        }
        
        let team_id = this.current_team.id
        let team_name = this.current_team.team_name
        
        // fetch athletes from DB
        if (!this.all_athletes.length) {
            await this.loadAthletes()
        }
        
        let team_athletes = this.all_athletes.filter((obj) => obj.team_id == team_id)

        let new_elements = document.createElement('div')

        if (!return_function) {
            return_function = this.listTeams
        }

        let return_button = createReturnButton(return_function)
        new_elements.appendChild(return_button)

        team_athletes.forEach((athlete) => {
            new_elements.appendChild(athlete.createDOM())
        })
        
        // Create add Athlete button

        let add_button = createAddButton('athlete', { team_name })
        new_elements.appendChild(add_button)

        this.replaceInterface(new_elements)

        this.page = 'athlete_list'

        this.last_load = async function() {await site_interface.listAthletes(null, return_function)}
    }
    openAthlete = async (athlete, return_function) => {
        
        this.current_athlete = athlete

        let new_elements = document.createElement('div')

        let return_button = createReturnButton(return_function)

        new_elements.appendChild(return_button)

        let include_edit_button = true
        new_elements.appendChild(athlete.createDOM(include_edit_button))
        new_elements.appendChild(athlete.listTrainingDays())

        this.replaceInterface(new_elements)

        this.page = `athlete_${athlete.id}`

        this.last_load = async function() {await site_interface.openAthlete(athlete, return_function)}
    }
    openTrainingDay = async (training_day) => {
        let athlete = training_day.athlete
        let day = training_day.day
        
        if (this.page == `athlete_${athlete.id}_${day}`) {
            return
        }
        this.current_training_day = training_day

        let new_elements = document.createElement('div')
        new_elements.appendChild(athlete.createDOM())
        new_elements.appendChild(training_day.createDOM())
        new_elements.appendChild(await training_day.createDayTrainingPlan())

        this.replaceInterface(new_elements)

        this.page = `athlete_${athlete.id}_${day}`
    }
}

// Restructure so that event isn't coupled to an athlete. Want to be able to create an overview of an event so that I can see what each athlete is doing there.

class Team {
    constructor(team_data) {
        this.team_name = team_data.team_name
        this.schedule = JSON.parse(team_data.schedule_json)
        this.id = team_data.id
    }
    createDOM = () => {
        let this_team = this
        let element = document.createElement('div')
        element.innerText = this.team_name
        element.classList.add('team')
        element.addEventListener('click', function() {
            site_interface.listAthletes(this_team, site_interface.last_load)
        })
        return element
    }
}

class Athlete {
    constructor(athlete_data) {
        let { id, name, age, level, focus, team_id } = athlete_data
        this.id = id
        this.name = name
        this.age = age
        this.level = level

        if (typeof focus == 'string') {
            focus = JSON.parse(focus)
        }

        this.focus = focus
        this.team_id = team_id

        this.processSchedule()

        site_interface.all_athletes.push(this)
    }

    processSchedule = () => {
        this.schedule = site_interface.all_teams.filter((obj) => obj.id == this.team_id)[0].schedule
        this.training_days = this.schedule.map(obj => obj.day)
    }

    createDOM = (include_edit_button) => {
        let this_athlete = this
        let element = document.createElement('h1')
        element.classList.add('athlete')
        element.id = this.id
        element.innerText = `${this.name} (${this.level} ${this.age})`
        element.addEventListener('click', function() {
            site_interface.openAthlete(this_athlete, site_interface.last_load)
        })

        if (include_edit_button) {
            let row = document.createElement('div')
            row.classList.add('row')
            row.appendChild(element)
            row.appendChild(this.createEditButton())
            return row
        }

        return element
    }

    createEditButton = () => {
        let this_athlete = this
        let edit_button = document.createElement('button')
        edit_button.classList.add('edit')
        edit_button.innerText = 'Edit'
        edit_button.addEventListener('click', function() {
            // open athlete form
            openModal('athlete_form')

            // fill form elements
            setEditAthleteForm(this_athlete)
        })
        return edit_button
    }

    listTrainingDays = () => {
        let training_day_list = document.createElement('div')
        training_day_list.classList.add('column')

        this.training_day_objects = []

        this.training_days.forEach((day) => {
            let training_day = new TrainingDay(this, day)
            let day_element = training_day.createDOM()
            training_day_list.appendChild(day_element)
            this.training_day_objects.push(training_day)
        })

        return training_day_list
    }
    save = async () => {
        // always save from form.
        let { name, age, level, focus, team_id } = processAthleteForm()
        this.name = name
        this.age = age
        this.level = level
        this.focus = JSON.parse(focus)
        this.team_id = team_id
        this.processSchedule()

        // save in DB
        let params = { name, age, level, focus, team_id, id: this.id }
        await fetchPostWrapper('/training/athletes/update', params)

        // close form, refresh
    }
    delete = async () => {
        await fetchPostWrapper('/training/athletes/delete', { id: this.id })
        site_interface.all_athletes = site_interface.all_athletes.filter((obj) => obj.id != this.id)
    }
}

class TrainingDay {
    constructor(athlete, day) {
        this.athlete = athlete,
        this.day = day

        
    }
    createDOM = () => {
        let this_training_day = this

        let day_element = document.createElement('div')
        day_element.classList.add('training_day')
        day_element.innerText = this.day
        day_element.addEventListener('click', function() {
            site_interface.openTrainingDay(this_training_day)
        })

        return day_element
    }

    createDayTrainingPlan = async () => {

        let params = { 
            day: this.day,
            athlete_id: this.athlete.id
         }
        let day_activities = await fetchPostWrapper('/training/activities/get', params)

        // event class for each event. append activities in order
        // day training plan has new event button
        // each event creates a new activity button
        // 
        this.event_objects = {}

        if (this.day == 'Sunday' && this.athlete.level == 'Gold') {
            ['Warmup', 'Bars', 'Vault', 'Beam', 'Floor', 'Conditioning', 'Cooldown'].forEach((event) => {
                this.event_objects[event] = new Event(event, this, this.athlete)
            })
        }

        let new_elements = document.createElement('div')

        day_activities.forEach((activity) => {
            let { event, sets, reps, rep_type, exercise_name, exericise_id, activity_order, event_order } = activity

            let event_obj;
            if (!(event in this.event_objects)) {
                event_obj = new Event(event, this, this.athlete)
                this.event_objects[event] = event_obj
                
            } else {
                event_obj = this.event_objects[event]
            }
            // event instance exists
            event_obj.addActivity({ sets, reps, rep_type, exercise_name, exericise_id })
        })

        // for each event, create dom element that lists activities, with button for add activity
        Object.values(this.event_objects).forEach((event) => {
            new_elements.appendChild(event.createDOM())
        })
        new_elements.appendChild(createAddButton('event'))

        new_elements.appendChild(createSaveButton(this.save))
        return new_elements
    }   

    save = async () => {
        // Read all activites and update/ save where needed
        Object.values(this.event_objects).forEach((event) => {
            let event_name = event.event_name
            event.activities.forEach((activity) => {
                console.log(event_name, activity.exercise_name)
            })
        })

    }
}

class Event {
    constructor(event_name, training_day_obj, athlete_obj) {
        this.event_name = event_name
        this.training_day_obj = training_day_obj
        this.athlete_obj = athlete_obj
        this.activities = []
    }
    addActivity = (activity) => {
        this.activities.push(new Activity(activity))
    }
    createDOM = () => {
        let new_elements = document.createElement('div')
        new_elements.classList.add('event')

        // add row when breakdown is added
        let title = document.createElement('h3')
        title.classList.add('event_name')
        title.innerText = this.event_name

        // activity header
        let activity_header = document.createElement('div')
        activity_header.classList.add('row', 'activity_header')
        activity_header.appendChild(createElementWithText('span', 'Activity'))
        activity_header.appendChild(createElementWithText('span', 'S'))
        activity_header.appendChild(createElementWithText('span', 'R'))
        activity_header.appendChild(createElementWithText('span', 'Done'))

        new_elements.appendChild(title)
        new_elements.appendChild(activity_header)

        this.activities.forEach((activity) => {
            new_elements.appendChild(activity.createDOM())
        })

        new_elements.appendChild(createAddButton('activity'))

        new_elements.id = `event_${this.event_name}`

        return new_elements
    }
}

class Activity {
    constructor({ sets, reps, rep_type, exercise_name, exericise_id, event }) {
        this.event = event
        this.sets = sets
        this.reps = reps
        this.rep_type = rep_type
        this.exercise_name = exercise_name
        this.exericise_id = exericise_id
    }
    createDOM = () => {
        let activity_element = document.createElement('div')
        activity_element.classList.add('activity')

        activity_element.appendChild(createElementWithText('span', this.exercise_name))
        activity_element.appendChild(createElementWithText('span', this.sets))
        activity_element.appendChild(createElementWithText('span', `${this.reps} ${this.rep_type}`))

        let finish_span = document.createElement('span')
        let finish_button = document.createElement('div')
        finish_button.classList.add('completion_box')
        finish_span.appendChild(finish_button)

        activity_element.appendChild(finish_span)

        return activity_element
    }
}

const site_interface = new siteInterface()

window.onload = async function() {
    site_interface.listTeams()
}