"""A model of a user's garden."""

import bisect
import datetime
import json

from collections import defaultdict
from dateutil.parser import parse as parse_date
from icalendar import Event


class Plant(object):
    """A single plant which is somewhere in a garden."""

    def __init__(self, name, plant_date_str, harvest_date_str):
        """Create a new plant.

        Args:
            name: string, The name of the plant.
            plant_date_str: str, The start date of the plant.
            growth_time: str, The harvest date of the plant.
        """
        self.name = name
        self._plant_date = plant_date_str
        self._harvest_date = harvest_date_str


    @property
    def plant_date(self):
        return parse_date(self._plant_date).date()


    @property
    def harvest_date(self):
        return parse_date(self._harvest_date).date()


    def Serialize(self):
        """Serialize this object into a JSON dictionary."""
        return dict(
            name=self.name,
            plant_date=self._plant_date,
            harvest_date=self._harvest_date)

    @classmethod
    def Load(cls, json):
        """Load this object from a JSON dictionary."""
        return cls(json['name'], json['plant_date'], json['harvest_date'])


class Garden(object):
    """A Garden is a unique collection of slots in a square shape.

    Each slot is a list of plants, where each plant has some plant time (the
    real-life time it was (or will) be plant(ed)), with an invariant that
    subsequent plants within the same slot must have start dates later that
    previous plants.

    The grid of plants is indexed from the top left (i.e. top left is (0, 0)).
    """

    def __init__(self, name, width, height):
        self.name = name
        self.slots = [[] for i in xrange(width*height)]
        self.width = width
        self.height = height

    def Serialize(self):
        """Serialize this object into a JSON dictionary."""
        slots = []
        for slot in self.slots:
            slots.append([p.Serialize() 
                          for p in sorted(slot, key=lambda p: p.plant_date)])

        return dict(
            name=self.name, width=self.width, height=self.height, slots=slots)

    def ProgressFor(self, slot_idx, plant_idx):
        """Get the progress bar widths for the space before and for some plant."""
        # The total time is 2 years; show up to 1 year in the future.
        now = datetime.datetime.now().date()
        start = now - datetime.timedelta(days=30)
        end = now + datetime.timedelta(days=180)
        days_total = float((end - start).days)

        # Get the total percent up until this plant.
        previous_percents = [self.ProgressFor(slot_idx, i)
                             for i in range(plant_idx)]
        total_percent = sum([sum(p) for p in previous_percents])

        # Get the current plant.
        plant = self.slots[slot_idx][plant_idx]

        # If we are looking at the first plant in a slot, compare it to the
        # minimum.
        whitespace_percent = 0
        if plant_idx == 0:
            # If one year ago was before the plant, then work out the amount of
            # space we need to show before the plant.
            if plant.plant_date > start:
                days_since_start = (plant.plant_date - start).days
                whitespace_percent = (float(days_since_start) / days_total)*100
            else:
                whitespace_percent = 0
        else:
            previous_plant = self.slots[slot_idx][plant_idx-1]
            days_since_last_plant_end = (
                plant.plant_date - previous_plant.harvest_date).days
            whitespace_percent = (float(days_since_last_plant_end) / days_total)*100

        days_of_plant = (plant.harvest_date - plant.plant_date).days
        plant_percent = (float(days_of_plant) / days_total)*100

        # If the whitespace percent or plant percent goes over this limit, then
        # set the corresponding one to this limit.
        if total_percent + whitespace_percent > 100:
            whitespace_percent = 100 - total_percent
            plant_percent = 0
        elif total_percent + whitespace_percent + plant_percent > 100:
            plant_percent = 100 - (total_percent + whitespace_percent)

        return whitespace_percent, plant_percent

    def AddEvents(self, cal):
        """Modify the given calendar by adding a series of events."""
        sow_events = defaultdict(list)
        harvest_events = defaultdict(list)

        for slot in self.slots:
            for plant in slot:
                sow_events[plant.plant_date].append(plant)
                harvest_events[plant.harvest_date].append(plant)

        # Add the events to the calendar.
        for sow_date, plants in sow_events.iteritems():
            event = Event()
            event['dtstart'] = sow_date
            event['dtend'] = sow_date
            event['summary'] = 'Sow %s' % (','.join([p.name for p in plants]))
            event['location'] = self.name
            cal.add_component(event)

        for harvest_date, plants in harvest_events.iteritems():
            event = Event()
            event['dtstart'] = harvest_date
            event['dtend'] = harvest_date
            event['summary'] = 'Harvest %s' % (','.join([p.name for p in plants]))
            event['location'] = self.name
            cal.add_component(event)        


    @classmethod
    def Load(cls, json):
        """Load this object from a JSON dictionary."""
        obj = cls(json['name'], json['width'], json['height'])
        for slot_idx, slot_json in enumerate(json['slots']):
            for plant_json in slot_json:
                obj.slots[slot_idx].append(Plant.Load(plant_json))

            obj.slots[slot_idx].sort(key=lambda p: p.plant_date)

        return obj

    def NotValidReason(self):
        """Get a reason as to why the garden isn't valid."""
        for slot in self.slots:
            for i in range(len(slot) - 1):
                p1 = slot[i]
                p2 = slot[i+1]

                if (p1.plant_date < p2.harvest_date and
                    p1.harvest_date > p2.plant_date and
                    p1.plant_date != p2.plant_date):
                    return ('Plant "%s" (planted on %s) would overlap with "%s" '
                            '(planted on %s).') % (p1.name, p1.plant_date,
                                                   p2.name, p2.plant_date)
        return None

    def IsValid(self):
        """Validate the current garden."""
        # Make sure none of the plants overlap.
        return self.NotValidReason() is None
