#! /usr/bin/env python
#
# ago Weather device
# Copyright (c) 2013 by rages
# Modifications by dinki
# Release History
# v.1 Initial release by rages
# v.2 Fix exception error plus modifications for using yahoo since weather.com not working and only report when values change
#
#
# Create CONFDIR/conf.d/weather.conf
# [weather]
# locations_ID=ITLM2916
# tempunits = f
# waittime = 30
#
import agoclient
import time
import threading
import pywapi
import string

import time

readID = agoclient.getConfigOption("weather","locations_ID","90210")
readTempUnits = agoclient.getConfigOption("weather","tempunits","f")
readWaitTime = int(agoclient.getConfigOption("weather","waittime","300"))
rain = "rain"
ex_temp = "ex_temp"
ex_umidity = "ex_umidity"

client = agoclient.AgoConnection("Weather")

client.addDevice(rain, "binarysensor")
client.addDevice(ex_temp, "temperaturesensor")
client.addDevice(ex_umidity, "multilevelsensor")

class testEvent(threading.Thread):
        def __init__(self,):
                threading.Thread.__init__(self)
        def run(self):
		old_temp = 0
		old_humidity = 0
                while (True):

			try:
				yahooweather_result = pywapi.get_weather_from_yahoo(readID)
				if yahooweather_result <> "":
					condizioni = yahooweather_result['condition']['text']
					temperatura = float(yahooweather_result['condition']['temp'])
					umidita = float(yahooweather_result['atmosphere']['humidity'])
					if temperatura <> old_temp:
						if (readTempUnits == 'f' or readTempUnits == 'F'):
							tempF = round(9.0/5.0 * temperatura + 32)
							client.emitEvent(ex_temp, "event.environment.temperaturechanged", tempF, "F")
						else:
       			                 		client.emitEvent(ex_temp, "event.environment.temperaturechanged", temperatura, "C")
					if umidita <> old_humidity:
		       				client.emitEvent(ex_umidity, "event.environment.humiditychanged", umidita, "%")
		                        search_Rain = string.find(condizioni, "Rain")
					search_Drizzle = string.find(condizioni, "Drizzle")
		                        if (search_Rain >= 0) or (search_Drizzle >=0):
						client.emitEvent(rain,"event.device.statechanged", "255", "")

		                        else :
						client.emitEvent(rain,"event.device.statechanged", "0", "")

			except KeyError:
				print "Error retrieving weather data!"
			old_temp = temperatura
			old_humidity = umidita
			time.sleep (readWaitTime)

background = testEvent()
background.setDaemon(True)
background.start()

client.run()

