# -*- coding: utf-8 -*-
from __future__ import print_function

from bs4 import BeautifulSoup

import json
import os
import re
import string
import sys
import urllib2


## The root of the information source to scrape.
_ROOT = 'http://www.gardenate.com'

## The page which contains a list of plants. This can be used to find which
## plants we can get information about.
_LIST_PAGE = _ROOT + '/plants'

## Suffix to add to the final page.
_PAGE_ARGS = '?zone=3'


def GetPlantInfo(information_div, css_class):
    """Extract the plant info from information_div with class css_class."""
    info_li = information_div.find('li', class_=css_class)
    if not info_li:
        return ''
    return ' '.join(info_li.find(text=True, recursive=False).split())


def FindFirstWordInList(list, keys):
    """Return the index, key of the first word in list which matches a key."""
    regex = re.compile('[%s]' % re.escape(string.punctuation))
    for i, word in enumerate(list):
        key = regex.sub('', word)
        if key in keys:
            return i, key

    return -1


def FindTimeRange(harvest_str):
    """Given a string containing harvest information, extract the time range.

    This takes as input some string like:
        "Harvest in 15-18 weeks. Loosen with a fork rather than pull by hand.."

    It will find the 15-18 weeks part, convert it to days and return a range
    (start, end) which is the number of days from sowing that you can harvest
    (in days). The time range must be before a date keyword ('days', 'weeks',
    'months' or 'years') and can either have one or two numbers, separated by a
    dash ('-').

    Args:
        harvest_str: str, the raw string from gardenate.

    Returns:
        tuple of int (start, end): The start and end of the harvest range in
        days.

    Raises:
        Exception: thrown if the string contains no time keyword ('days,
                   'weeks', 'months' or 'years') or if the string has a time
                   range which is unparsable.
    """
    words = harvest_str.split()
    idx, key = FindFirstWordInList(words, {'days', 'weeks', 'months', 'years'})
    if idx < 0:
        raise Exception(
            'Could not extract time range from string %s' % harvest_str)

    # Look at the previous word. It should match this regex.
    assert idx > 0
    time_range = words[idx - 1]
    if not re.match('[0-9]+(\-[0-9]+)?', time_range):
        raise Exception('Could not parse time range %s' % time_range)

    # Parse the time range.
    times = time_range.split('-')
    start = int(times[0])
    end = int(times[-1])

    # Convert the units.
    if key == 'weeks':
        start *= 7
        end *= 7
    elif key == 'months':
        start = int(start * (365/12))
        end = int(end * (365/12))
    elif key == 'years':
        start *= 365
        end *= 365

    return (start, end)


if __name__ == '__main__':
    # Load a list of plants from the list page.
    soup = BeautifulSoup(urllib2.urlopen(_LIST_PAGE).read(), 'html.parser')
    plant_urls = [plant_div.find('a')
                  for plant_div in soup.find_all('div', class_='plant')]

    # Load the plants dictionary. If there is already a file on disk, then use
    # that, otherwise just default to an empty map.
    plants = {}
    if os.path.exists('plants.json'):
        plants = json.load(open('plants.json', 'rU'))

    # For each plant...
    for plant_url in plant_urls:
        # Get details about the plant.
        url = _ROOT + plant_url.get('href') + _PAGE_ARGS
        name = plant_url.string

        # If we've already looked at this plant, just skip it.
        if name in plants:
            print('Skipping %s' % name)
            continue

        # Load the data from the webpage.
        print('Loading %s...' % (url))
        sys.stdout.flush()
        plant_soup = BeautifulSoup(urllib2.urlopen(url).read(), 'html.parser')

        # 1. Extract the calendar.
        calendar_raw = plant_soup.find(
            'div', id='calendar').table.find_all('tr')[1].find_all('td')

        assert len(calendar_raw) == 12
        calendar = [month.string.strip() for month in calendar_raw]

        # 2. Extract useful information.
        info = plant_soup.find('div', class_='info').ul

        sowing = GetPlantInfo(info, 'sowing')
        spacing = GetPlantInfo(info, 'spacing')
        harvest = GetPlantInfo(info, 'harvest')
        companion = GetPlantInfo(info, 'companion')

        # Convert the harvest into a pair, of the max/min days before harvest.
        harvest_start, harvest_end = FindTimeRange(harvest)

        # Save the plant.
        plants[name] = dict(
            name=name,
            url=url,
            calendar=calendar,
            harvest_start=harvest_start,
            harvest_end=harvest_end,
            sowing=sowing,
            spacing=spacing,
            harvest=harvest,
            companion=companion,
        )

        # Save after each plant; so we can pause and resume.
        with open('plants.json', 'w') as output_file:
            json.dump(plants, output_file)
