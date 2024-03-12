const api_url_base = 'https://scrambler-api.onrender.com'
let highest_z_index = 0

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

function openModal(modal_name) {
    highest_z_index++
    
    let modal = document.getElementById(modal_name)
    modal.classList.remove('closed')
    modal.style.zIndex = highest_z_index

}

function closeModal(modal_name) {
    highest_z_index--

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

function createNewExerciseOption() {
    let option = document.createElement('option')
    // when selected, open new exercise form and deselect
    option.innerText = '~ Create New Exercise ~'
    option.value = 'create_new'

    let exercise = document.getElementById('choose_exercise')
    exercise.addEventListener('change', function() {
        if (exercise.value == option.value) {
            setCreateExerciseForm() // creates save button which will reload options and select created exercise
            openModal('exercise_form')
            option.selected = false
        }
        
    })
    option.selected = false
    return option
}

function setCreateExerciseForm() {
    let save_button = createSaveButton(createExercise, ['exercise_form'], function() {setFormExercises(site_interface.newest_exercise.id)})
    document.getElementById('exercise_save_button_holder').appendChild(save_button)
}

function setNewAthleteForm({ team_name }) {
    setAthleteFormTeam(team_name)

    let save_button = createSaveButton(createAthlete, ['athlete_form'])
    document.getElementById('athlete_save_button_holder').appendChild(save_button)
}

function setNewActivityForm(params) {
    setTeamFormAthletes(params) // in new activity form, set athlete options

    setActivityFormEvent()

    setFormExercises()

    let save_button = createSaveButton(createActivity, ['activity_form'])
    document.getElementById('activity_save_button_holder').appendChild(save_button)
}

function setNewTeamForm() {
    $('#team_form_name').val('')
    $('#save_team_button_holder').text('')
    let save_button = createSaveButton(createTeam, ['team_form'])
    $('#save_team_button_holder').append(save_button)
}

$('.add_button.exercise')[0].addEventListener('click', function() {
    openModal('exercise_form')
    setCreateExerciseForm()
})

function setActivityFormEvent() {
    let event = site_interface.current_event
    console.log(event)
    let event_name = event?.event_name || ''
    let day = site_interface.current_day

    let event_input = document.querySelectorAll('#activity_form_form [name=event_combo]')[0]
    event_input.value = `${day} ${event_name}`
}

function setFormExercises(selected_exercise_id) {

    var $select = $('#selectize').selectize({
        maxItems: 1,
        valueField: 'id',
        labelField: 'title',
        searchField: 'title',
        options: [
        ],
        create: false
      });

    let selector = $select[0].selectize

    let exercise_options = site_interface.createExerciseOptions() // TODO: needs updated - currently creates DOM elements which aren't needed.
    exercise_options.forEach(option => {
        // set selectize
        let name = option.innerText
        let id = option.value
        let newoption = {id: id, title: name}
        selector.addOption(newoption)

        if (option.value == selected_exercise_id) {
            option.selected = true
            selector.addItem(id)
        }

    })
    
}

function setAthleteFormTeam(team_name) {
    let team_select_doms = site_interface.createTeamOptions() // array of dom elements

    let forms = document.querySelectorAll('.form_athlete_team')
    
    forms.forEach(form_team => {
        form_team.textContent = ''

        team_select_doms.forEach((dom_el) => {
            if (dom_el.getAttribute('value') == team_name) {
                dom_el.selected = true
            }
            form_team.appendChild(dom_el)
        })
    })
    
}

function setTeamFormAthletes({ athlete_id }) {

    var $select = $('#selectize_athlete').selectize({
        maxItems: null,
        valueField: 'id',
        labelField: 'title',
        searchField: 'title',
        options: [
        ],
        create: false
      });

    let selector = $select[0].selectize

    selector.clearOptions()

    let athlete_options = site_interface.createAthleteOptions() // TODO: needs updated - currently creates DOM elements which aren't needed.
    athlete_options.forEach(option => {
        // set selectize
        let name = option.innerText
        let id = option.value
        let newoption = {id: id, title: name}
        selector.addOption(newoption)

        if (option.value == athlete_id) {
            selector.addItem(id)
        }

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
    document.getElementById('form_athlete_notes').value = athlete.notes

    let save_button = createSaveButton(athlete.save, ['athlete_form'])
    document.getElementById('athlete_save_button_holder').appendChild(save_button)

    // expose delete button. set eventHandler to this athlete
    let delete_button = createDeleteButton(athlete, ['athlete_form'], site_interface.listAthletes)
    document.getElementById('athlete_delete_button_holder').appendChild(delete_button)
    
    // replace create button with save. On modal close, delete buttons are removed, replace save with create and remove event handler
}

function createScheduleForm(day, start, end, events) {

    if (events === undefined) {
        events = []
    }
    if (day === undefined) {
        day = ''
    }
    if (start === undefined) {
        start = ''
    }
    if (end === undefined) {
        end = ''
    }
    

    function createEventRow() {
        let event_row = document.createElement('div')
        event_row.classList.add('row', 'event_holder')
        

        let nameinput = document.createElement('input')
        nameinput.setAttribute('type', 'text')
        nameinput.setAttribute('name', 'event_name')

        let durinput = document.createElement('input')
        durinput.setAttribute('type', 'number')
        durinput.setAttribute('name', 'duration')

        let del_button = document.createElement('button')
        del_button.innerText = 'delete'
        del_button.addEventListener('click', function() {
            events_holder.removeChild(event_row)
        })

        event_row.appendChild(nameinput)
        event_row.appendChild(durinput)
        event_row.appendChild(del_button)

        return event_row
    }

    let new_elements = document.createElement('div')
    new_elements.classList.add('schedule')

    let daylabel = createElementWithText('label', 'Day:')
    let dayinput = document.createElement('input')
    dayinput.setAttribute('type', 'text')
    dayinput.setAttribute('name', 'day')
    dayinput.value = day
    
    let startlabel = createElementWithText('label', 'Start Time:')
    let startinput = document.createElement('input')
    startinput.setAttribute('type', 'text')
    startinput.setAttribute('name', 'start')
    startinput.value = start

    let endlabel = createElementWithText('label', 'End Time:')
    let endinput = document.createElement('input')
    endinput.setAttribute('type', 'text')
    endinput.setAttribute('name', 'end')
    endinput.value = end

    let eventslabel = createElementWithText('label', 'Events:')
    let label_row = document.createElement('div')
    label_row.classList.add('row')
    let eventnamelabel = createElementWithText('label', 'Event')
    let eventdurlabel = createElementWithText('label', 'Duration')
    label_row.appendChild(eventnamelabel)
    label_row.appendChild(eventdurlabel)

    let events_holder = document.createElement('div')

    new_elements.appendChild(daylabel)
    new_elements.appendChild(dayinput)
    new_elements.appendChild(startlabel)
    new_elements.appendChild(startinput)
    new_elements.appendChild(endlabel)
    new_elements.appendChild(endinput)
    new_elements.appendChild(eventslabel)
    new_elements.appendChild(label_row)
    new_elements.appendChild(events_holder)

    

    events.forEach(({ event_name, duration }) => {
        let event_row = document.createElement('div')
        event_row.classList.add('row', 'event_holder')
        

        let nameinput = document.createElement('input')
        nameinput.value = event_name
        nameinput.setAttribute('type', 'text')
        nameinput.setAttribute('name', 'event_name')

        let durinput = document.createElement('input')
        durinput.value = duration
        durinput.setAttribute('type', 'number')
        durinput.setAttribute('name', 'duration')

        let del_button = document.createElement('button')
        del_button.innerText = 'delete'
        del_button.addEventListener('click', function() {
            events_holder.removeChild(event_row)
        })

        event_row.appendChild(nameinput)
        event_row.appendChild(durinput)
        event_row.appendChild(del_button)

        events_holder.appendChild(event_row)
    })

    let add_button = document.createElement('button')
    add_button.innerText = 'Add Event'
    add_button.addEventListener('click', function() {
        let event_row = createEventRow()
        events_holder.appendChild(event_row)
    })
    new_elements.appendChild(add_button)

    return new_elements
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
                site_interface.last_load()
            }
            
        }

    })

    openModal('confirm_delete_modal')
}

function createReturnButton(return_function, clear_value) {
    let button = document.createElement('button')
    button.innerText = 'Back'
    button.classList.add('back')
    button.addEventListener('click', function() {
        return_function()
        site_interface[clear_value] = null
    })
    return button
}

function createDayViewButton() {
    let button = document.createElement('button')
    button.innerText = 'Training Days'
    button.classList.add('nav')
    button.addEventListener('click', site_interface.listTeamTrainingDays)
    return button
}

function createEditTeamButton() {
    let button = document.createElement('button')
    button.innerText = 'Edit'
    button.classList.add('edit')
    button.addEventListener('click', site_interface.openEditTeam)
    return button
}

function createAthleteViewButton() {
    let button = document.createElement('button')
    button.innerText = 'Athletes'
    button.classList.add('nav')
    button.addEventListener('click', site_interface.listAthletes)
    return button
}

function createAddButton(elementType, default_params) {
    if (!default_params) {
        default_params = {}
    }

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
            button.addEventListener('click', function() {
                openModal('athlete_form')
                setNewAthleteForm(default_params) // save button isn't fed an athlete
            })
            break;
        case 'event':
            button.addEventListener('click', function() {
                openModal('event_form')
            })
            break;
        case 'activity':
            button.addEventListener('click', function() {
                openModal('activity_form')
                setNewActivityForm(default_params)
            })
            break;
        case 'team':
            button.addEventListener('click', function() {
                openModal('team_form')
                setNewTeamForm()
            })
            break;
        case 'day':
            button.id = 'add_schedule_button'
            button.addEventListener('click', function() {
                let empty_schedule = createScheduleForm()
                $('#add_schedule_button').before(empty_schedule)
            })
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

function createActivityHeader() {
    
    let activity_header = document.createElement('div')
    activity_header.classList.add('row', 'activity_header')
    activity_header.appendChild(createElementWithText('span', 'Activity'))
    activity_header.appendChild(createElementWithText('span', 'S'))
    activity_header.appendChild(createElementWithText('span', 'R'))
    activity_header.appendChild(createElementWithText('span', 'Done'))

    return activity_header
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

    let multi_selects = {}
    form.querySelectorAll('input, textarea').forEach((input) => {
        let input_name = input.getAttribute('name')
        let input_value = input.value
        if (input.getAttribute('type') == 'number') {
            input_value = parseInt(input_value)
        }
        if (input.getAttribute('type') == 'checkbox' && !input.checked) {
            return // skip
        } else if (input.getAttribute('type') == 'checkbox') {
            input_name in multi_selects ? multi_selects[input_name].push(input_value) : multi_selects[input_name] = [input_value]
        } else {
            if (input.getAttribute('multi') == 'true') {
                input_value = input_value.split(',').map(obj => obj.trim())
            }

            results[input_name] = input_value
        }

        
    })
    form.querySelectorAll('select').forEach((select) => {
        let select_name = select.getAttribute('name')
        select.querySelectorAll('option').forEach((option) => {
            if (option.selected) {
                let select_value = option.value
                results[select_name] = select_value
            }
        })
    })

    Object.entries(multi_selects).forEach(([name, value]) => {
        results[name] = value
    })

    let selectors = $(`#${form_id} .selectized`)
    selectors.each(function() {
        let selectize = this
        let select_name = selectize.getAttribute('name')
        
        selectize = selectize.selectize
        let select_value = selectize.getValue()

        results[select_name] = select_value
    })

    return results
}

function processAthleteForm() {
    let { name, level, age, team_name, focus, notes } = getFormContents('athlete_form_form')
    focus = JSON.stringify(focus.split(', ')) // turn into list
    let team_id = site_interface.all_teams.filter(obj => obj.team_name == team_name)[0]['id']

    return { name, age, level, focus, team_id, notes }
}

function processActivityForm() {
    // TODO: update so exercise_id is returned. Need a create_exercise form
    let { athlete_id, event_combo, exercise_id, sets, reps, rep_type } = getFormContents('activity_form_form') // { athlete_id, event (R Bars), Exercise name, sets, reps, rep_type }
    

    let [day, event] = event_combo.split(' ')
    
    switch (day) {
        case 'R':
            day = 'Thursday'
            break;
        case 'T':
            day = 'Tuesday'
            break;
        case 'Su':
            day = 'Sunday'
            break;
    }
    // TODO: activity_order needs to be determined by how many existing activities belong to current athlete-event. Default last
    let activity_order = site_interface.getAthleteEventActivityCount(athlete_id, day, event)

    return { athlete_id, day, event, sets, reps, rep_type, exercise_id, activity_order }
}

function processExerciseForm() {
    let { name, movement_type, function_f, related_skills } = getFormContents('exercise_form_form')

    return { name, movement_type, function_f, related_skills }
}

async function saveSchedule() {
    // parse schedule
    let days = document.querySelectorAll('#schedule_holder .schedule')
    let schedule_json = []
    days.forEach(schedule => {
        let this_json = {}
        let day = schedule.querySelector('[name=day]')
        this_json['day'] = day.value

        let start = schedule.querySelector('[name=start]')
        this_json['start'] = start.value

        let end = schedule.querySelector('[name=end]')
        this_json['end'] = end.value

        let events = []
        schedule.querySelectorAll('.event_holder').forEach(event_h => {
            let name = event_h.querySelector('[name=event_name]').value
            let dur = event_h.querySelector('[name=duration]').value
            events.push({ event_name: name, duration: dur })
        })
        this_json['events'] = events
        schedule_json.push(this_json)
    })

    let { id, team_name } = site_interface.current_team
    await fetchPostWrapper('/training/teams/update', { id, schedule: JSON.stringify(schedule_json), team_name })

    site_interface.current_team.schedule = schedule_json

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

async function createTeam() {
    let team_name = $('#team_form_name').val()
    let params = { team_name }
    let results = await fetchPostWrapper('/training/teams/create', params)
    params['id'] = results['id']

    let new_team = new Team(params)
    return false
}

async function createActivity(e) {

    let params = processActivityForm() // { athlete_id, day, event, sets, reps, rep_type, exercise_id, activity_order }

    let athletes = params['athlete_id']



    if (athletes instanceof Array) {
        console.log('multiple')
        await Promise.all(athletes.map(async (athlete_id_single) => {
            let single_params = { ...params }
            single_params['athlete_id'] = athlete_id_single

            let results = await fetchPostWrapper('/training/activities/create', single_params)
            single_params['id'] = results['id']    

            let activity = new Activity(single_params)

            console.log(activity)
        }))
    } else {
        let results = await fetchPostWrapper('/training/activities/create', params)
        params['id'] = results['id']    

        let activity = new Activity(params)
    }

    
    // page refreshes and should show new activity

    return false
}

async function createExercise() {
    let params = processExerciseForm()


    let results = await fetchPostWrapper('/training/exercises/create', params)
    params['id'] = results['id']


    let exercise = new Exercise(params)

    return false
}


class siteInterface {
    constructor() {
        this.current_team = null
        this.current_athlete = null
        this.current_training_day = null
        this.current_event = null
        
        this.all_teams = []
        this.all_athletes = []
        this.all_activities = []
        this.all_exercises = []

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
    loadActivities = async () => {
        this.all_activities = []
        let activity_data = await fetchPostWrapper('/training/activities/get')

        if (activity_data) {
            activity_data.forEach((activity) => {
                activity = new Activity(activity)
            })
        }
    }
    
    loadExercises = async () => {
        this.all_exercises = []
        let exercise_data = await fetchPostWrapper('/training/exercises/get')

        if (exercise_data) {
            exercise_data.forEach((exercise) => {
                exercise = new Exercise(exercise)
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
    createAthleteOptions = () => {
        // creates dropdown list options for athletes on current selected team
        let current_team = this.current_team
        let athlete_objs = this.all_athletes.filter(obj => obj.team_id == current_team.id)

        let elements = []
        athlete_objs.forEach((athlete) => {
            let option_dom = document.createElement('option')
            option_dom.value = athlete.id
            option_dom.innerText = athlete.name
            elements.push(option_dom)
        })
        return elements
    }

    createExerciseOptions = () => {
        // load all assets on page load (exercises)
        // option value needs to be exercise_id
        let options = []
        this.all_exercises.forEach(exercise => {
            let name = exercise.name
            let id = exercise.id

            let option = document.createElement('option')
            option.value = id
            option.innerText = name
            options.push(option)
        })

        return options
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
    getAthleteName = (athlete_id) => {
        let athlete = this.all_athletes.filter(obj => obj.id == athlete_id)[0]
        return athlete.name
    }
    getExerciseName = (exercise_id) => {
        let exercise = this.all_exercises.filter(obj => obj.id == exercise_id)[0]
        return exercise.name
    }
    getAthleteEventActivityCount = (athlete_id, day, event_name) => {
        let activities = this.all_activities.filter(obj => (obj.athlete_id == athlete_id && obj.day == day && obj.event_name == event_name))
        let n_activities = activities.length
        return n_activities
    }

    filterActivites = ({ event_name, day, athlete_id }) => {
        if (!athlete_id) { // event_name and day only - looking for all activites for a certain day and event
            let activities = this.all_activities.filter(obj => obj.event == event_name && obj.day == day)
            return activities
        }
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

        let page_title = createElementWithText('h1', 'Teams:')
        new_elements.appendChild(page_title)

        this.all_teams.forEach((team) => {
            let team_dom = team.createDOM()
            new_elements.appendChild(team_dom)
        })

        let add_button = createAddButton('team')
        new_elements.appendChild(add_button)
        this.replaceInterface(new_elements)

        this.last_load = this.listTeams
    }
    listAthletes = async (team, return_function) => {
        // Display all athletes on a team

        // are we changing teams?
        if (team && team instanceof Team) {
            this.current_team = team
        } else {
            team = this.current_team
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

        let return_button = createReturnButton(this.listTeams, 'current_team')
        new_elements.appendChild(return_button)

        let days_view_button = createDayViewButton()
        new_elements.appendChild(days_view_button)

        let edit_team_button = createEditTeamButton()
        new_elements.appendChild(edit_team_button)


        team_athletes.forEach((athlete) => {
            new_elements.appendChild(athlete.createDOM())
        })
        
        // Create add Athlete button

        let add_button = createAddButton('athlete', { team_name })
        new_elements.appendChild(add_button)

        this.replaceInterface(new_elements)

        this.last_load = async function() {await site_interface.listAthletes(team, return_function)}
    }
    listEventActivities = async (event_e) => {
        // Display all activities, grouped by athlete, for an event (on a specific day)
        this.current_event = event_e

        let new_elements = document.createElement('div')


        let back_button = createReturnButton(function() {site_interface.openTrainingDay(event_e.day)}, 'current_event')
        new_elements.appendChild(back_button)

        let event_description = document.createElement('div')
        event_description.innerText = `${event_e.day} ${event_e.event_name} (${event_e.duration} min)`
        new_elements.appendChild(event_description)

        // textarea for event notes
        let event_notes = event_e.event_notes
        let notes_field = createElementWithText('textarea', event_notes)
        new_elements.appendChild(notes_field)

        let save_notes_button = createSaveButton(async function() {
            let note = notes_field.value
            let schedule = site_interface.current_team.schedule
            let day_index = schedule.findIndex(obj => obj.day == event_e.day)
            let event_index = schedule[day_index]['events'].findIndex(obj => obj.event_name == event_e.event_name)
            
            schedule[day_index]['events'][event_index]['event_notes'] = note

            site_interface.current_team.schedule = schedule

            let { id, team_name } = site_interface.current_team
            await fetchPostWrapper('/training/teams/update', { id, schedule: JSON.stringify(schedule), team_name })

        }, [], function() {})
        new_elements.appendChild(save_notes_button)

        let athletes = this.all_athletes.filter(obj => obj.team_id == this.current_team.id)
        let { event_name, day } = event_e

        athletes.forEach(athlete => {
            let athlete_name = athlete.name
            let athlete_id = athlete.id

            let athlete_obj = document.createElement('div')

            let athlete_title = document.createElement('h2')
            athlete_title.innerText = athlete_name
            athlete_obj.appendChild(athlete_title)

            let activities_div = document.createElement('div')

            let activity_header = createActivityHeader()
            activities_div.appendChild(activity_header)

            
            let activities = this.all_activities.filter(obj => obj.event == event_name && obj.day == day && obj.athlete_id == athlete_id)

            activities.forEach(activity => {
                
                let activity_dom = activity.createDOM()
                activities_div.appendChild(activity_dom)

            })
            athlete_obj.appendChild(activities_div)
            new_elements.appendChild(athlete_obj)
        })

        let add_activity_button = createAddButton('activity')
        new_elements.appendChild(add_activity_button)

        this.replaceInterface(new_elements)

        this.last_load = async function() {await site_interface.listEventActivities(event_e)}

    }
    listTeamTrainingDays = async () => {
        // Display all days that team trains. Athlete not selected

        let new_elements = document.createElement('div')

        let return_button = createReturnButton(this.listTeams, 'current_team')
        new_elements.appendChild(return_button)

        let athletes_view_button = createAthleteViewButton()
        new_elements.appendChild(athletes_view_button)


        let team = this.current_team
        let days = team.getDays()
        let this_interface = this

        days.forEach(day => {
            let day_element = document.createElement('div')
            day_element.classList.add('training_day', 'item')
            day_element.innerText = day
            day_element.addEventListener('click', function() {
                this_interface.openTrainingDay(day, team.id)
            })
            new_elements.appendChild(day_element)
        })
    
        
        this.replaceInterface(new_elements)

        this.last_load = this.listTeamTrainingDays
    }
    listAthleteTrainingDays = async (athlete_id, return_function) => {
        let team_id = this.current_team.id
        if (!return_function) {
            return_function = this.listAthletes
        }

        let this_interface = this
        let team = this.all_teams.filter(obj => obj.id == team_id)[0]
        let days = team.getDays()

        let new_elements = document.createElement('div')
    
            days.forEach(day => {
                let day_element = document.createElement('div')
                day_element.classList.add('training_day', 'item')
                day_element.innerText = day
                day_element.addEventListener('click', function() {
                    this_interface.openAthleteDay(day, athlete_id)
                })
                new_elements.appendChild(day_element)
            })
    
        return new_elements
        
    }

    openTrainingDay = async (day) => {
        // Display all the events that occur on this day. Athlete not selected
        this.current_day = day

        let new_elements = document.createElement('div')

        let team = this.current_team

        let return_button = createReturnButton(site_interface.listTeamTrainingDays, 'current_day')
        new_elements.appendChild(return_button)

        let title = document.createElement('h1')
        title.innerText = `${team.name} - ${day}:`

        let day_events = team.getDayEvents(day)
        day_events.forEach(event => { // {event_name: 'Warmup', duration: 15}

            // get events on that day, create event objects for each.
            // each event on creation calls DB to get its activities
            let event_obj = new Event_e(event['event_name'], day, event['duration'], event['event_notes'])

            // each Event calls 'listEventActivities' onclick
            let event_dom = event_obj.createDOM()
            new_elements.appendChild(event_dom)
        })

        this.replaceInterface(new_elements)

        this.last_load = async function() {await site_interface.openTrainingDay(day)}
    }

    openAthlete = async (athlete, return_function) => {
        // Display athlete's training days
        
        this.current_athlete = athlete

        let new_elements = document.createElement('div')

        let return_button = createReturnButton(this.listAthletes, 'current_athlete')

        new_elements.appendChild(return_button)

        let include_edit_button = true
        new_elements.appendChild(athlete.createDOM(include_edit_button))

        let athlete_training_days_dom = await this.listAthleteTrainingDays(athlete.id)
        new_elements.appendChild(athlete_training_days_dom)

        this.replaceInterface(new_elements)

        this.last_load = async function() {await site_interface.openAthlete(athlete, return_function)}
    }

    openAthleteDay = async (day, athlete_id) => {
        // Display events athlete has on this day
        this.current_day = day

        if (!this.all_activies || !this.all_activities.length) {
            await this.loadActivities()
        }

        let new_elements = document.createElement('div')

        let athlete = this.all_athletes.filter(obj => obj.id == athlete_id)[0]

        let return_button = createReturnButton(async function() {await site_interface.openAthlete(athlete)}, 'current_day')
        new_elements.appendChild(return_button)

        let title = document.createElement('h1')
        title.innerText = `${this.getAthleteName(athlete_id)} ${day}:`
        new_elements.appendChild(title)

        let day_events = this.current_team.getDayEvents(day)
        day_events.forEach(event => { // {event_name: 'Warmup', duration: 15}

            // get events on that day, create event objects for each.
            // each event on creation calls DB to get its activities
            let event_obj = new Event_e(event['event_name'], day, event['duration'], event['event_notes'])

            // this function will call each event's listAthleteEvent to filter activities for specific athlete
            let athlete_event = event_obj.createAthleteEventDOM(athlete_id)
            new_elements.appendChild(athlete_event)
        })
        
        // add_activity_button
        let create_activity_button = createAddButton('activity', { athlete_id })
        new_elements.appendChild(create_activity_button)

        this.replaceInterface(new_elements)

        this.last_load = async function() {await site_interface.openAthleteDay(day, athlete_id)}

    }

    openEditTeam = async () => {
        openModal('schedule_form')

        // create editable schedule
        let schedule = this.current_team.schedule
        let schedule_holder = document.getElementById('schedule_holder')

        schedule_holder.textContent = ''

        schedule.forEach(({ day, start, end, events }) => {

            let day_schedule = createScheduleForm(day, start, end, events)
            schedule_holder.appendChild(day_schedule)

        })

        if (!schedule.length) {
            let day_schedule = createScheduleForm()
            schedule_holder.appendChild(day_schedule)
        }

        let add_day_button = createAddButton('day')
        schedule_holder.appendChild(add_day_button)

        console.log(this.current_team.schedule)
        // save on save
        let save_button_holder = document.getElementById("schedule_save_button_holder")
        let save_button = createSaveButton(saveSchedule, ['schedule_form'])
        save_button_holder.textContent = ''
        save_button_holder.appendChild(save_button)
    }
}

// Restructure so that event isn't coupled to an athlete. Want to be able to create an overview of an event so that I can see what each athlete is doing there.

class Team {
    constructor(team_data) {
        this.team_name = team_data.team_name
        if ('schedule_json' in team_data && team_data.schedule_json !== null) {
            this.schedule = JSON.parse(team_data.schedule_json)
        } else {
            this.schedule = []
        }
        
        this.id = team_data.id
    }
    createDOM = () => {
        let this_team = this
        let element = document.createElement('div')
        element.innerText = this.team_name
        element.classList.add('team', 'item')
        element.addEventListener('click', function() {
            site_interface.listAthletes(this_team, site_interface.last_load)
        })
        return element
    }
    getDays = () => {
        let days = this.schedule.map(obj => obj.day)
        return days
    }
    getDayEvents = (day) => {
        let schedule_day = this.schedule.filter(obj => obj.day == day)[0]
        let events = schedule_day['events'] // {event_name: 'Warmup', duration: 15}
        return events 
    }
    createTrainingDaysDOM = (athlete) => {
        let days = this.getDays()

        let new_elements = document.createElement('div')

        days.forEach(day => {
            let day_element = document.createElement('div')
            day_element.classList.add('training_day', 'item')
            day_element.innerText = day
            day_element.addEventListener('click', function() {
                site_interface.openAthleteDay(this_training_day)
            })
            new_elements.appendChild(day_element)
        })

        return new_elements
    }
    save = () => {

    }

}

class Athlete {
    constructor(athlete_data) {
        let { id, name, age, level, focus, team_id, notes } = athlete_data
        this.notes = notes
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
        // Refactor - will call on team to list days      

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
        let { name, age, level, focus, team_id, notes } = processAthleteForm()
        this.name = name
        this.age = age
        this.level = level
        this.focus = JSON.parse(focus)
        this.team_id = team_id
        this.notes = notes
        this.processSchedule()

        // save in DB
        let params = { name, age, level, focus, team_id, id: this.id, notes }
        await fetchPostWrapper('/training/athletes/update', params)

        // close form, refresh
    }
    delete = async () => {
        await fetchPostWrapper('/training/athletes/delete', { id: this.id })
        site_interface.all_athletes = site_interface.all_athletes.filter((obj) => obj.id != this.id)
    }
}


class Event_e {
    constructor(event_name, day, duration, event_notes) {
        this.event_name = event_name
        this.day = day
        this.duration = duration
        this.event_notes = event_notes
        this.activities = site_interface.filterActivites({ event_name, day }) // all activites on event and day

    }
    getAthleteEvent = (athlete_id) => {
        let athlete_activities = this.activities.filter(obj => obj.athlete_id == athlete_id)
        return athlete_activities
    }

    createDOM = () => { // team-only event
        let this_event = this
        let event_obj = document.createElement('div')
        event_obj.classList.add('event', 'item')
        event_obj.innerText = `${this.event_name} (${this.duration} min)`
        event_obj.addEventListener('click', function() {
            site_interface.listEventActivities(this_event)})
        return event_obj

    }

    createAthleteEventDOM = (athlete_id) => {
        let new_elements = document.createElement('div')
        new_elements.classList.add('event', 'item')

        // add row when breakdown is added
        let title = document.createElement('h3')
        title.classList.add('event_name')
        title.innerText = this.event_name

        // activity header
        let activity_header = createActivityHeader()

        new_elements.appendChild(title)
        new_elements.appendChild(activity_header)

        this.getAthleteEvent(athlete_id).forEach((activity) => {
            new_elements.appendChild(activity.createDOM())
        })

        new_elements.id = `event_${this.event_name}`

        return new_elements
    }
}

class Activity {
    constructor({ id, athlete_id, day, event, sets, reps, rep_type, exercise_id, activity_order, event_part }) {
        this.id = id
        this.event = event
        this.day = day
        this.sets = sets
        this.reps = reps
        this.rep_type = rep_type
        this.exercise_id = exercise_id
        this.athlete_id = athlete_id
        this.activity_order = activity_order
        this.event_part = event_part

        this.exercise_name = site_interface.getExerciseName(exercise_id)

        site_interface.all_activities.push(this)
    }
    createDOM = () => {
        let this_activity = this
        let activity_element = document.createElement('div')
        activity_element.classList.add('activity')

        let activity_name = `${this.exercise_name}`
        if (this.event_part) {
            activity_name = `(${this.event_part}) ` + activity_name
        }

        let activity_title = createElementWithText('span', activity_name)
        activity_title.addEventListener('click', function () {
            openModal('activity_form')
            this_activity.setActivityUpdateForm()
        })

        activity_element.appendChild(activity_title)
        activity_element.appendChild(createElementWithText('span', this.sets))
        activity_element.appendChild(createElementWithText('span', `${this.reps} ${this.rep_type}`))

        let finish_span = document.createElement('span')
        let finish_button = document.createElement('div')
        finish_button.classList.add('completion_box')
        finish_span.appendChild(finish_button)

        let delete_button = createDeleteButton(this, [])
        finish_span.appendChild(delete_button)

        activity_element.appendChild(finish_span)

        

        return activity_element
    }

    delete = async () => {

        await fetchPostWrapper('/training/activities/delete', { id: this.id })
        site_interface.all_activities = site_interface.all_activities.filter(obj => obj.id != this.id)
    }

    update = async (changes) => {
        
        Object.entries(changes).forEach(([key, val]) => {
            this[key] = val
            
        })
        changes['id'] = this.id
        this.exercise_name = site_interface.getExerciseName(this.exercise_id)
        
        await fetchPostWrapper('/training/activities/update', changes)
    }

    updateFromForm = async () => {
        // if one athlete ID, update this activity
        // if multiple, update this activity if match
        // create new activity for rest

        let params = processActivityForm() // { athlete_id, day, event, sets, reps, rep_type, exercise_id, activity_order }

        let athletes = params['athlete_id']

        if (athletes instanceof Array) {
            let new_athletes = athletes.filter(obj => obj != this.athlete_id)
            
            await Promise.all(new_athletes.map(async (athlete_id_single) => {
                let single_params = { ...params }
                single_params['athlete_id'] = athlete_id_single

                let results = await fetchPostWrapper('/training/activities/create', single_params)
                single_params['id'] = results['id']    

                let activity = new Activity(single_params)

            }))

            let this_athlete = athletes.filter(obj => obj == this.athlete_id)
            if (this_athlete.length) {
                let single_params = { ...params }
                single_params['athlete_id'] = this_athlete[0]
                await this.update(single_params)
            }

        } else {
            await this.update(params)
        }
    }

    setActivityUpdateForm = async () => {
        setTeamFormAthletes({ athlete_id: this.athlete_id }) // in new activity form, set athlete options { athlete_id }

        setFormExercises()


        let selector = $('#selectize')[0].selectize
        selector.addItem(this.exercise_id)

        // set exercise, event, sets, reps, rep type
        $('#activity_event').val(`${this.day} ${this.event}`)
        $('#activity_event_part').val(this.event_part)
        $('#activity_sets').val(this.sets)
        $('#activity_reps').val(this.reps)
        $('#activity_rep_type').val(this.rep_type)

        let save_button = createSaveButton(this.updateFromForm, ['activity_form'])
        document.getElementById('activity_save_button_holder').appendChild(save_button)
    }
}

class Exercise {
    constructor({ id, name, movement_type, _ }) {
        this.id = id
        this.name = name

        site_interface.all_exercises.push(this)
        site_interface.newest_exercise = this
    }
}

const site_interface = new siteInterface()

window.onload = async function() {
    await site_interface.loadTeams()
    await site_interface.loadAthletes()
    await site_interface.loadExercises()
    await site_interface.loadActivities()
    

    site_interface.listTeams()
}