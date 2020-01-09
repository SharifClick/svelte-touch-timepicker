<script>
  import Switcher from './Switcher.svelte';

  const HOURS = new Array(12).fill(1).map((v, i) => v + i);
  const MINUTES = new Array(59).fill(1).map((v, i) => v + i);
  const MERIDIEM = ['AM', 'PM'];


  export let time = new Date();
  export let _time, selectedHour, selectedMeridiem;
  export let visible = false;

  let resetTime = (event) => {
    event.stopPropagation()
    time = new Date();
  }

  $: {
    _time = time.toLocaleTimeString('en-US', {timeStyle: 'short'});
    selectedHour = +time.toLocaleTimeString('en-us', {hour12:true, hour:'numeric'}).split(' ')[0];
    selectedMeridiem = time.getHours() < 12 ? 1 : 2;
  }

  let timeChanged = (event) => {

    let {type, changedData} = event.detail;
    let newTime = new Date();

    if (type === 'hours'){
      let thresholdHour = selectedMeridiem === 2 ? 13 : 1;
      newTime.setHours(changedData + thresholdHour);
      newTime.setMinutes(time.getMinutes())

    } else if (type === 'minutes'){

      newTime.setHours(time.getHours())
      newTime.setMinutes(changedData + 1)

    } else if (type === 'meridiem'){
      let thresholdHour = ~~changedData ? 12 : ~11;
      newTime.setHours(time.getHours() + thresholdHour )
      newTime.setMinutes(time.getMinutes())
    }

    time = newTime;
  }
</script>

<style>
.touch-time-popup{
  z-index: 1;
  position: fixed;
  top:0;
  left:0;
  right:0;
  bottom:0;
  background: rgba(0, 0, 0, 0.3);
  touch-action: pan-down;
}
.touch-time-popup > div{
  background: var(--svtt-popup-bg-color, white);
  color: var(--svtt-popup-color, black);
  margin-top: 30vh;
  width: 85%;
  margin-left: 7%;
  border-radius: var(--svtt-popup-radius, 10px);
}
.touch-time-wrapper{
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  font-size: var(--svtt-font-size, 20px);
  padding: 1.5rem;
}

.touch-time-picker {
  display: flex;
  padding: 50px 20px;
  margin: 10px 0;
  overflow: hidden;
}

.touch-time-reset > button {
  width: 100px;
  height: 30px;
  border-radius: 15px;
  border: var(--svtt-border, 1px solid grey);
  outline: none;
  color: var(--svtt-button-color, black);
  background-color: var(--svtt-button-bg-color, transparent);
  box-shadow: var(--svtt-button-box-shadow, none) ;
  font-weight: 300;
}
.touch-time-reset button:nth-child(1):active {
  -webkit-transform: scale(0.95);
          transform: scale(0.95);
}


</style>

<input type="text" readonly value={_time} on:focus={() => {visible = !visible}}>
{#if visible}
  <div class="touch-time-popup" >
    <div>
      <div class="touch-time-wrapper">
          <div class='touch-time'>{_time}</div>
          <div class='touch-time-picker'>
            <Switcher type='hours' data={HOURS} selected={selectedHour} on:timeChange={timeChanged} }/>
            <Switcher type='minutes' data={MINUTES} selected={time.getMinutes() } on:timeChange={timeChanged}/>
            <Switcher type='meridiem' data={MERIDIEM} selected={selectedMeridiem} on:timeChange={timeChanged}/>
          </div>
        <div class='touch-time-reset'>
          <button on:click={resetTime}>Reset</button>
          <button on:click={() => {visible = !visible}}>Ok</button>
        </div>
      </div>
    </div>
  </div>


{/if}

