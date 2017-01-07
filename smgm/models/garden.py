"""A model of a user's garden."""

import bisect
import datetime
import json


_JS_DATE_FORMAT = '%Y-%m-%d'


class Plant(object):
    """A single plant which is somewhere in a garden."""

    def __init__(self, name, plant_date, harvest_date):
        """Create a new plant.

        Args:
            name: string, The name of the plant.
            plant_date: datetime.date, The start date of the plant.
            growth_time: int, The growth time (in days) of the plant.
        """
        self.name = name
        self.plant_date = plant_date
        self.harvest_date = harvest_date

    def Serialize(self):
        """Serialize this object into a JSON dictionary."""
        return dict(
            name=self.name,
            plant_date=self.plant_date.strftime(_JS_DATE_FORMAT),
            harvest_date=self.harvest_date.strftime(_JS_DATE_FORMAT))

    @classmethod
    def Load(cls, json):
        """Load this object from a JSON dictionary."""
        return cls(
            json['name'],
            datetime.datetime.strptime(json['plant_date'], _JS_DATE_FORMAT),
            datetime.datetime.strptime(json['harvest_date'], _JS_DATE_FORMAT))


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
        return dict(
            name=self.name,
            width=self.width,
            height=self.height,
            slots=[[p.Serialize() for p in slot] for slot in self.slots])

    @classmethod
    def Load(cls, json):
        """Load this object from a JSON dictionary."""
        obj = cls(json['name'], json['width'], json['height'])
        for slot_idx, slot_json in enumerate(json['slots']):
            for plant_json in slot_json:
                obj.slots[slot_idx].append(Plant.Load(plant_json))

            obj.slots[slot_idx].sort(key=lambda p: p.plant_date)

        return obj

    def IsValid(self):
        """Validate the current garden."""
        # Make sure none of the plants overlap.
        for slot in self.slots:
            for i in range(len(slot) - 1):
                p1 = slot[i]
                p2 = slot[i+1]

                if (p1.plant_date < p2.harvest_date and
                    p1.harvest_date > p2.plant_date):
                    return False

        return True
