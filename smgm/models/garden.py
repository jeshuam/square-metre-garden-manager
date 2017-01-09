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

    def _JsTimeagoDatetime(self, date):
        """Return a datetime compatible with timeago.

        This will ensure that the hours, minutes and seconds match the current
        time, with the goal being that "2 days ago" actually means 2 days ago.
        Without this, it will over- or under-estimate the difference.

        Args:
            date: datetime.Date, the date to modify.

        Returns:
            A modified version of datetime.now() with the year, month and day
            set based on `date`.
        """
        return datetime.datetime.now().replace(
            year=date.year, month=date.month, day=date.day)

    def JsPlantDate(self):
        return self._JsTimeagoDatetime(self.plant_date)

    def JsHarvestDate(self):
        return self._JsTimeagoDatetime(self.harvest_date)

    def DaysLeft(self):
        """Return the number of days left until harvest."""
        return (self.harvest_date - datetime.datetime.now().date()).days

    def Progress(self):
        """Get the plant's progress as a percentage from 0 -> 100.

        This will use the current date as the percentage point.
        """
        now = datetime.datetime.now().date()
        since_start_days = float((now - self.plant_date).days)
        total_days = float((self.harvest_date - self.plant_date).days)
        return int((since_start_days / total_days) * 100)


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
            datetime.datetime.strptime(json['plant_date'], _JS_DATE_FORMAT).date(),
            datetime.datetime.strptime(json['harvest_date'], _JS_DATE_FORMAT).date())


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

    def NotValidReason(self):
        """Get a reason as to why the garden isn't valid."""
        for slot in self.slots:
            for i in range(len(slot) - 1):
                p1 = slot[i]
                p2 = slot[i+1]

                if (p1.plant_date < p2.harvest_date and
                    p1.harvest_date > p2.plant_date):
                    return ('Plant "%s" (planted on %s) would overlap with "%s" '
                            '(planted on %s).') % (p1.name, p1.plant_date,
                                                   p2.name, p2.plant_date)
        return None

    def IsValid(self):
        """Validate the current garden."""
        # Make sure none of the plants overlap.
        return self.NotValidReason() is None
