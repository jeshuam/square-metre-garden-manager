"""A model of a user's garden."""

import bisect
import datetime
import json


class Plant(object):
    """A single plant which is somewhere in a garden."""

    def __init__(self, name, plant_date, growth_time):
        """Create a new plant.

        Args:
            name: string, The name of the plant.
            plant_date: datetime.date, The start date of the plant.
            growth_time: int, The growth time (in days) of the plant.
        """
        self.name = name
        self.plant_date = plant_date
        self._growth_time = growth_time

    @property
    def harvest_date(self):
        """Get the harvest date of the plant, based on the growth time."""
        return self.plant_date + datetime.timedelta(days=self._growth_time)

    def Serialize(self):
        """Serialize this object into a JSON dictionary."""
        return dict(
            name=self.name,
            plant_date=self.plant_date.toordinal(),
            growth_time=self._growth_time)

    @classmethod
    def Load(cls, json):
        """Load this object from a JSON dictionary."""
        return cls(
            json['name'],
            datetime.date.fromordinal(json['plant_date']),
            json['growth_time'])


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
        self.size = (width, height)

    def Serialize(self):
        """Serialize this object into a JSON dictionary."""
        return dict(
            name=self.name,
            width=self.size[0],
            height=self.size[1],
            slots=[[p.Serialize() for p in slot] for slot in self.slots])

    @classmethod
    def Load(cls, json):
        """Load this object from a JSON dictionary."""
        obj = cls(json['name'], json['width'], json['height'])
        for slot_idx, slot_json in enumerate(json['slots']):
        	for plant_json in slot_json:
        		obj.slots[slot_idx].append(Plant.Load(plant_json))

        return obj

    def _GetSlot(self, x, y):
        """Get the slot at the given coordinates.

        Args:
              x: int, the x-coordinate to get the slot for.
              y: int, the y-coordinate to get the slot for.

        Returns:
            The slot at index (x, y).

        Raises:
            IndexError: thrown if the coordinates are invalid.
        """
        width, height = self.size
        if x < 0 or x >= width or y < 0 or y >= height:
            raise IndexError("Invalid coordinates (%d, %d)" % (x, y))

        return self.slots[x + y*width]

    def AddPlant(self, x, y, new_plant):
        """Add a new plant to this garden.

        Args:
                x: int, the x - coordinate to insert the plant into.
                y: int, the y - coordinate to insert the plant into.
                new_plant: Plant, the plant to insert into the grid.
        """
        slot = self._GetSlot(x, y)

        # Does this start time overlap with anything?
        for plant in slot:
            if (plant.plant_date < new_plant.harvest_date and
                plant.harvest_date > new_plant.plant_date):
            	print(len(slot))
                raise ValueError("Plant overlaps with another.")

        # Insert the plant into its position.
        bisect.insort_left(slot, new_plant)
